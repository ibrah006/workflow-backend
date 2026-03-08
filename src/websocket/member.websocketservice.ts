import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Repository } from 'typeorm';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { verify } from 'jsonwebtoken';
import { AppDataSource } from '../data-source';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

export interface MemberChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'role_changed' | 'invited' | 'removed';
  memberId: string;
  member?: Partial<User>;
  changedBy?: string;
  timestamp: Date;
  changes?: Record<string, any>;
}

export class MemberWebSocketService {
  private io;
  private userRepo: Repository<User>;
  private organizationRepo: Repository<Organization>;
  private organizationRooms: Map<string, Set<string>> = new Map();

  constructor(
    // httpServer: HTTPServer
    io: SocketIOServer
  ) {
    this.io = io.of('/members');
    // new SocketIOServer(httpServer, {
    //   cors: {
    //     origin: process.env.FRONTEND_URL || '*',
    //     credentials: true,
    //     methods: ['GET', 'POST'],
    //   },
    //   path: '/ws/members',
    // });

    this.io.on('connection', (socket) => {
      console.log('Member socket connected');
    });

    this.userRepo = AppDataSource.getRepository(User);
    this.organizationRepo = AppDataSource.getRepository(Organization);

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Authenticate socket connections using JWT
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = verify(token, process.env.JWT_SECRET!) as any;

        // Fetch user details
        const user = await this.userRepo.findOne({
          where: { id: decoded.userId },
          relations: ['organization'],
        });

        if (!user || !user?.organization?.id) {
          return next(new Error('User not found or not associated with an organization'));
        }

        // Attach user info to socket
        socket.user = {
          id: decoded.id,
          organizationId: decoded.organizationId,
          email: decoded.email,
          role: decoded.role,
        };

        console.log(`from middleware decoded: ${JSON.stringify(decoded)},\nuser ID: ${user.id}, org ID: ${user.organization.id}`);

        next();
      } catch (error) {
        console.log("exact error - members socker:", error);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      console.log(`Client connected to members: ${socket.id}, User: ${socket.user?.id}, organization Id: ${socket.user?.organizationId}`);

      // Join organization-specific room
      if (socket.user?.organizationId) {
        const roomName = `org:${socket.user.organizationId}`;
        socket.join(roomName);

        // Track connected users per organization
        if (!this.organizationRooms.has(socket.user.organizationId)) {
          this.organizationRooms.set(socket.user.organizationId, new Set());
        }
        this.organizationRooms.get(socket.user.organizationId)?.add(socket.id);

        console.log(`User ${socket.user.id} joined member organization room: ${roomName}`);

        // Notify others in the organization
        socket.to(roomName).emit('user:connected', {
          userId: socket.user.id,
          email: socket.user.email,
          timestamp: new Date(),
        });
      }

      // Handle subscription to specific member
      socket.on('member:subscribe', (memberId: string) => {
        this.handleMemberSubscription(socket, memberId);
      });

      // Handle unsubscription from specific member
      socket.on('member:unsubscribe', (memberId: string) => {
        socket.leave(`member:${memberId}`);
        console.log(`Socket ${socket.id} unsubscribed from member ${memberId}`);
      });

      // Handle requesting current member data
      socket.on('member:get', async (memberId: string) => {
        await this.handleGetMember(socket, memberId);
      });

      // Handle requesting all organization members
      socket.on('members:list', async (filters?: any) => {
        await this.handleListMembers(socket, filters);
      });

      // Handle manual refresh request
      socket.on('members:refresh', async () => {
        await this.handleListMembers(socket);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send initial connection success event
      socket.emit('connected', {
        message: 'Successfully connected to member updates',
        organizationId: socket.user?.organizationId,
        timestamp: new Date(),
      });

      // Auto-send members list on connect
      await this.handleListMembers(socket);
    });
  }

  /**
   * Subscribe to specific member updates
   */
  private async handleMemberSubscription(socket: AuthenticatedSocket, memberId: string): Promise<void> {
    try {
      const member = await this.userRepo.findOne({
        where: { id: memberId },
        relations: ['organization', 'department'],
      });

      if (!member || member.organization?.id !== socket.user?.organizationId) {
        socket.emit('error', {
          message: 'Member not found or access denied',
          memberId,
        });
        return;
      }

      socket.join(`member:${memberId}`);
      console.log(`Socket ${socket.id} subscribed to member ${memberId}`);

      socket.emit('member:subscribed', {
        memberId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error subscribing to member:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to member',
        memberId,
      });
    }
  }

  /**
   * Get single member data
   */
  private async handleGetMember(socket: AuthenticatedSocket, memberId: string): Promise<void> {
    try {
      const member = await this.userRepo.findOne({
        where: { id: memberId },
        relations: ['organization', 'department', 'tasks'],
      });

      if (!member || member.organization?.id !== socket.user?.organizationId) {
        socket.emit('error', {
          message: 'Member not found or access denied',
          memberId,
        });
        return;
      }

      socket.emit('member:data', {
        member: this.sanitizeMember(member),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      socket.emit('error', {
        message: 'Failed to fetch member',
        memberId,
      });
    }
  }

  /**
   * List all members for the organization
   */
  private async handleListMembers(socket: AuthenticatedSocket, filters?: any): Promise<void> {
    try {
      const queryBuilder = this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.organization', 'organization')
        .leftJoinAndSelect('user.department', 'department')
        .leftJoin('user.tasks', 'tasks')
        .addSelect('COUNT(CASE WHEN tasks.status != :completed THEN 1 END)', 'activeTaskCount')
        .where('user.organization.id = :organizationId', { 
          organizationId: socket.user?.organizationId,
          completed: 'completed'
        })
        .groupBy('user.id')
        .addGroupBy('organization.id')
        .addGroupBy('department.id');

      // Apply filters if provided
      if (filters?.role) {
        queryBuilder.andWhere('user.role = :role', { role: filters.role });
      }
      if (filters?.departmentId) {
        queryBuilder.andWhere('user.department.id = :departmentId', { 
          departmentId: filters.departmentId 
        });
      }
      if (filters?.search) {
        queryBuilder.andWhere(
          '(user.name ILIKE :search OR user.email ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      queryBuilder.orderBy('user.createdAt', 'DESC');

      const members = await queryBuilder.getMany();

      // Get active task counts separately (TypeORM limitation with complex queries)
      const membersWithTaskCounts = await Promise.all(
        members.map(async (member) => {
          const activeTaskCount = await this.userRepo
            .createQueryBuilder('user')
            .leftJoin('user.tasks', 'tasks')
            .where('user.id = :userId', { userId: member.id })
            .andWhere('tasks.status != :completed', { completed: 'completed' })
            .getCount();

          return {
            ...this.sanitizeMember(member),
            activeTaskCount,
          };
        })
      );

      socket.emit('members:list', {
        members: membersWithTaskCounts,
        count: membersWithTaskCounts.length,
        filters,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error listing members:', error);
      socket.emit('error', {
        message: 'Failed to fetch members',
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    console.log(`Client disconnected from members: ${socket.id}`);

    if (socket.user?.organizationId) {
      const roomName = `org:${socket.user.organizationId}`;
      const orgSockets = this.organizationRooms.get(socket.user.organizationId);
      
      if (orgSockets) {
        orgSockets.delete(socket.id);
        if (orgSockets.size === 0) {
          this.organizationRooms.delete(socket.user.organizationId);
        }
      }

      // Notify others in the organization
      this.io.to(roomName).emit('user:disconnected', {
        userId: socket.user.id,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast member change to organization members
   */
  public broadcastMemberChange(
    organizationId: string,
    event: MemberChangeEvent
  ): void {
    const roomName = `org:${organizationId}`;
    this.io.to(roomName).emit('member:changed', event);

    // Also emit to specific member room if exists
    if (event.memberId) {
      this.io.to(`member:${event.memberId}`).emit('member:updated', event);
    }
  }

  /**
   * Broadcast member creation (invitation)
   */
  public broadcastMemberCreated(
    organizationId: string,
    member: User,
    createdBy: string
  ): void {
    this.broadcastMemberChange(organizationId, {
      type: 'created',
      memberId: member.id,
      member: this.sanitizeMember(member),
      changedBy: createdBy,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast member update
   */
  public broadcastMemberUpdated(
    organizationId: string,
    member: User,
    updatedBy: string,
    changes?: Record<string, any>
  ): void {
    this.broadcastMemberChange(organizationId, {
      type: 'updated',
      memberId: member.id,
      member: this.sanitizeMember(member),
      changedBy: updatedBy,
      changes,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast member role change
   */
  public broadcastMemberRoleChanged(
    organizationId: string,
    memberId: string,
    newRole: string,
    changedBy: string
  ): void {
    this.broadcastMemberChange(organizationId, {
      type: 'role_changed',
      memberId,
      changedBy,
      changes: { role: newRole },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast member deletion/removal
   */
  public broadcastMemberRemoved(
    organizationId: string,
    memberId: string,
    removedBy: string
  ): void {
    this.broadcastMemberChange(organizationId, {
      type: 'removed',
      memberId,
      changedBy: removedBy,
      timestamp: new Date(),
    });
  }

  /**
   * Sanitize member data before broadcasting (remove sensitive info)
   */
  private sanitizeMember(member: User): Partial<User> {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone,
      createdAt: member.createdAt,
      skills: member.skills,
      efficiencyScore: member.efficiencyScore,
      duration: member.duration,
      // Don't send password or other sensitive data
    };
  }

  /**
   * Get connected users count for an organization
   */
  public getOrganizationConnectionCount(organizationId: string): number {
    return this.organizationRooms.get(organizationId)?.size || 0;
  }

  /**
   * Shutdown the WebSocket server
   */
  // public async shutdown(): Promise<void> {
  //   return new Promise((resolve) => {
  //     this.io.close(() => {
  //       console.log('Member WebSocket server closed');
  //       resolve();
  //     });
  //   });
  // }
}