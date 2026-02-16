import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Repository } from 'typeorm';
import { Task } from '../models/Task';
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

export interface TaskChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assignee_added' | 'assignee_removed';
  taskId: number;
  task?: Partial<Task>;
  changedBy?: string;
  timestamp: Date;
  changes?: Record<string, any>;
}

export class TaskWebSocketService {
  private io: SocketIOServer;
  private taskRepo: Repository<Task>;
  private userRepo: Repository<User>;
  private organizationRooms: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/ws/tasks',
    });

    this.taskRepo = AppDataSource.getRepository(Task);
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
        const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

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
          organizationId: user.organization.id,
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
      console.log(`Client connected: ${socket.id}, User: ${socket.user?.id}`);

      // Join organization-specific room
      if (socket.user?.organizationId) {
        const roomName = `org:${socket.user.organizationId}`;
        socket.join(roomName);

        // Track connected users per organization
        if (!this.organizationRooms.has(socket.user.organizationId)) {
          this.organizationRooms.set(socket.user.organizationId, new Set());
        }
        this.organizationRooms.get(socket.user.organizationId)?.add(socket.id);

        console.log(`User ${socket.user.id} joined organization room: ${roomName}`);

        // Notify others in the organization
        socket.to(roomName).emit('user:connected', {
          userId: socket.user.id,
          email: socket.user.email,
          timestamp: new Date(),
        });
      }

      // Handle subscription to specific tasks
      socket.on('task:subscribe', (taskId: number) => {
        this.handleTaskSubscription(socket, taskId);
      });

      // Handle unsubscription from specific tasks
      socket.on('task:unsubscribe', (taskId: number) => {
        socket.leave(`task:${taskId}`);
        console.log(`Socket ${socket.id} unsubscribed from task ${taskId}`);
      });

      // Handle requesting current task data
      socket.on('task:get', async (taskId: number) => {
        await this.handleGetTask(socket, taskId);
      });

      // Handle requesting all organization tasks
      socket.on('tasks:list', async (filters?: any) => {
        await this.handleListTasks(socket, filters);
      });

      // Handle manual refresh request
      socket.on('tasks:refresh', async () => {
        await this.handleListTasks(socket);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send initial connection success event
      socket.emit('connected', {
        message: 'Successfully connected to task updates',
        organizationId: socket.user?.organizationId,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Subscribe to specific task updates
   */
  private async handleTaskSubscription(socket: AuthenticatedSocket, taskId: number): Promise<void> {
    try {
      const task = await this.taskRepo.findOne({
        where: { id: taskId },
        relations: ['project', 'project.organization'],
      });

      if (!task || task.project?.organization?.id !== socket.user?.organizationId) {
        socket.emit('error', {
          message: 'Task not found or access denied',
          taskId,
        });
        return;
      }

      socket.join(`task:${taskId}`);
      console.log(`Socket ${socket.id} subscribed to task ${taskId}`);

      socket.emit('task:subscribed', {
        taskId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error subscribing to task:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to task',
        taskId,
      });
    }
  }

  /**
   * Get single task data
   */
  private async handleGetTask(socket: AuthenticatedSocket, taskId: number): Promise<void> {
    try {
      const task = await this.taskRepo.findOne({
        where: { id: taskId },
        relations: ['project', 'project.organization', 'assignees', 'printer', 'material'],
      });

      if (!task || task.project?.organization?.id !== socket.user?.organizationId) {
        socket.emit('error', {
          message: 'Task not found or access denied',
          taskId,
        });
        return;
      }

      socket.emit('task:data', {
        task,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      socket.emit('error', {
        message: 'Failed to fetch task',
        taskId,
      });
    }
  }

  /**
   * List all tasks for the organization
   */
  private async handleListTasks(socket: AuthenticatedSocket, filters?: any): Promise<void> {
    try {
      const where: any = {
        project: {
          organizationId: socket.user?.organizationId,
        },
      };

      // Apply filters if provided
      if (filters?.status) {
        where.status = filters.status;
      }
      if (filters?.projectId) {
        where.project = { id: filters.projectId };
      }

      const tasks = await this.taskRepo.find({
        where,
        relations: ['project', 'assignees', 'printer', 'material'],
        order: { createdAt: 'DESC' },
      });

      socket.emit('tasks:list', {
        tasks,
        count: tasks.length,
        filters,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error listing tasks:', error);
      socket.emit('error', {
        message: 'Failed to fetch tasks',
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    console.log(`Client disconnected: ${socket.id}`);

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
   * Broadcast task change to organization members
   */
  public broadcastTaskChange(
    organizationId: string,
    event: TaskChangeEvent
  ): void {
    const roomName = `org:${organizationId}`;
    this.io.to(roomName).emit('task:changed', event);

    // Also emit to specific task room if exists
    if (event.taskId) {
      this.io.to(`task:${event.taskId}`).emit('task:updated', event);
    }
  }

  /**
   * Broadcast task creation
   */
  public broadcastTaskCreated(
    organizationId: string,
    task: Task,
    createdBy: string
  ): void {
    this.broadcastTaskChange(organizationId, {
      type: 'created',
      taskId: task.id,
      task: this.sanitizeTask(task),
      changedBy: createdBy,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast task update
   */
  public broadcastTaskUpdated(
    organizationId: string,
    task: Task,
    updatedBy: string,
    changes?: Record<string, any>
  ): void {
    this.broadcastTaskChange(organizationId, {
      type: 'updated',
      taskId: task.id,
      task: this.sanitizeTask(task),
      changedBy: updatedBy,
      changes,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast task status change
   */
  public broadcastTaskStatusChanged(
    organizationId: string,
    taskId: number,
    oldStatus: string,
    newStatus: string,
    changedBy: string
  ): void {
    this.broadcastTaskChange(organizationId, {
      type: 'status_changed',
      taskId,
      changedBy,
      changes: { oldStatus, newStatus },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast task deletion
   */
  public broadcastTaskDeleted(
    organizationId: string,
    taskId: number,
    deletedBy: string
  ): void {
    this.broadcastTaskChange(organizationId, {
      type: 'deleted',
      taskId,
      changedBy: deletedBy,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast assignee changes
   */
  public broadcastAssigneeChange(
    organizationId: string,
    taskId: number,
    type: 'assignee_added' | 'assignee_removed',
    assigneeId: string,
    changedBy: string
  ): void {
    this.broadcastTaskChange(organizationId, {
      type,
      taskId,
      changedBy,
      changes: { assigneeId },
      timestamp: new Date(),
    });
  }

  /**
   * Sanitize task data before broadcasting
   */
  private sanitizeTask(task: Task): Partial<Task> {
    // Return only necessary fields to reduce payload size
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      priority: task.priority,
      updatedAt: task.updatedAt,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
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
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}