import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Repository } from 'typeorm';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { verify } from 'jsonwebtoken';
import { AppDataSource } from '../data-source';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    organizationId: string;
    email: string;
  };
}

export interface CompanyChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'activated' | 'deactivated';
  companyId: string;
  company?: Partial<Company>;
  changedBy?: string;
  timestamp: Date;
  changes?: Record<string, any>;
}

export class CompanyWebSocketService {
  private io: SocketIOServer;
  private companyRepo: Repository<Company>;
  private userRepo: Repository<User>;
  private organizationRooms: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
        cors: {
            // Allow all origins for Flutter mobile/desktop apps
            // For production, you can specify allowed origins or use a validation function
            origin: process.env.FRONTEND_URL || '*',
            credentials: true,
            methods: ['GET', 'POST'],
        },
      path: '/ws/companies',
    });

    this.companyRepo = AppDataSource.getRepository(Company);
    this.userRepo = AppDataSource.getRepository(User);

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
          id: user.id,
          organizationId: user?.organization?.id,
          email: user.email,
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Client connected to companies: ${socket.id}, User: ${socket.user?.id}`);

      // Join organization-specific room
      if (socket.user?.organizationId) {
        const roomName = `org:${socket.user.organizationId}`;
        socket.join(roomName);

        // Track connected users per organization
        if (!this.organizationRooms.has(socket.user.organizationId)) {
          this.organizationRooms.set(socket.user.organizationId, new Set());
        }
        this.organizationRooms.get(socket.user.organizationId)?.add(socket.id);

        console.log(`User ${socket.user.id} joined company organization room: ${roomName}`);

        // Notify others in the organization
        socket.to(roomName).emit('user:connected', {
          userId: socket.user.id,
          email: socket.user.email,
          timestamp: new Date(),
        });
      }

      // Handle subscription to specific company
      socket.on('company:subscribe', (companyId: string) => {
        this.handleCompanySubscription(socket, companyId);
      });

      // Handle unsubscription from specific company
      socket.on('company:unsubscribe', (companyId: string) => {
        socket.leave(`company:${companyId}`);
        console.log(`Socket ${socket.id} unsubscribed from company ${companyId}`);
      });

      // Handle requesting current company data
      socket.on('company:get', async (companyId: string) => {
        await this.handleGetCompany(socket, companyId);
      });

      // Handle requesting all organization companies
      socket.on('companies:list', async (filters?: any) => {
        await this.handleListCompanies(socket, filters);
      });

      // Handle manual refresh request
      socket.on('companies:refresh', async () => {
        await this.handleListCompanies(socket);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send initial connection success event
      socket.emit('connected', {
        message: 'Successfully connected to company updates',
        organizationId: socket.user?.organizationId,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Subscribe to specific company updates
   */
  private async handleCompanySubscription(socket: AuthenticatedSocket, companyId: string): Promise<void> {
    try {
      const company = await this.companyRepo.findOne({
        where: { id: companyId },
        relations: ['organization'],
      });

      if (!company || company.organizationId !== socket.user?.organizationId) {
        socket.emit('error', {
          message: 'Company not found or access denied',
          companyId,
        });
        return;
      }

      socket.join(`company:${companyId}`);
      console.log(`Socket ${socket.id} subscribed to company ${companyId}`);

      socket.emit('company:subscribed', {
        companyId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error subscribing to company:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to company',
        companyId,
      });
    }
  }

  /**
   * Get single company data
   */
  private async handleGetCompany(socket: AuthenticatedSocket, companyId: string): Promise<void> {
    try {
      const company = await this.companyRepo.findOne({
        where: { id: companyId },
        relations: ['organization', 'createdBy', 'projects'],
      });

      if (!company || company.organizationId !== socket.user?.organizationId) {
        socket.emit('error', {
          message: 'Company not found or access denied',
          companyId,
        });
        return;
      }

      socket.emit('company:data', {
        company,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching company:', error);
      socket.emit('error', {
        message: 'Failed to fetch company',
        companyId,
      });
    }
  }

  /**
   * List all companies for the organization
   */
  private async handleListCompanies(socket: AuthenticatedSocket, filters?: any): Promise<void> {
    try {
      const where: any = {
        organizationId: socket.user?.organizationId,
      };

      // Apply filters if provided
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters?.industry) {
        where.industry = filters.industry;
      }

      const companies = await this.companyRepo.find({
        where,
        relations: ['createdBy', 'organization'],
        order: { createdAt: 'DESC' },
      });

      socket.emit('companies:list', {
        companies,
        count: companies.length,
        filters,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error listing companies:', error);
      socket.emit('error', {
        message: 'Failed to fetch companies',
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    console.log(`Client disconnected from companies: ${socket.id}`);

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
   * Broadcast company change to organization members
   */
  public broadcastCompanyChange(
    organizationId: string,
    event: CompanyChangeEvent
  ): void {
    const roomName = `org:${organizationId}`;
    this.io.to(roomName).emit('company:changed', event);

    // Also emit to specific company room if exists
    if (event.companyId) {
      this.io.to(`company:${event.companyId}`).emit('company:updated', event);
    }
  }

  /**
   * Broadcast company creation
   */
  public broadcastCompanyCreated(
    organizationId: string,
    company: Company,
    createdBy: string
  ): void {
    this.broadcastCompanyChange(organizationId, {
      type: 'created',
      companyId: company.id,
      company: this.sanitizeCompany(company),
      changedBy: createdBy,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast company update
   */
  public broadcastCompanyUpdated(
    organizationId: string,
    company: Company,
    updatedBy: string,
    changes?: Record<string, any>
  ): void {
    this.broadcastCompanyChange(organizationId, {
      type: 'updated',
      companyId: company.id,
      company: this.sanitizeCompany(company),
      changedBy: updatedBy,
      changes,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast company status change (activated/deactivated)
   */
  public broadcastCompanyStatusChanged(
    organizationId: string,
    companyId: string,
    isActive: boolean,
    changedBy: string
  ): void {
    this.broadcastCompanyChange(organizationId, {
      type: isActive ? 'activated' : 'deactivated',
      companyId,
      changedBy,
      changes: { isActive },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast company deletion
   */
  public broadcastCompanyDeleted(
    organizationId: string,
    companyId: string,
    deletedBy: string
  ): void {
    this.broadcastCompanyChange(organizationId, {
      type: 'deleted',
      companyId,
      changedBy: deletedBy,
      timestamp: new Date(),
    });
  }

  /**
   * Sanitize company data before broadcasting
   */
  private sanitizeCompany(company: Company): Partial<Company> {
    // Return only necessary fields to reduce payload size
    return {
      id: company.id,
      name: company.name,
      description: company.description,
      isActive: company.isActive,
      email: company.email,
      industry: company.industry,
      phone: company.phone,
      contactName: company.contactName,
      updatedAt: company.updatedAt,
      createdAt: company.createdAt,
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
  public async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('Company WebSocket server closed');
        resolve();
      });
    });
  }
}