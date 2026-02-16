import { Repository } from 'typeorm';
import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { getTaskWebSocketService } from '../websocketSetup';
import { AppDataSource } from '../data-source';

export class TaskServiceWebsocket {
  private taskRepo: Repository<Task>;
  private projectRepo: Repository<Project>;
  private userRepo: Repository<User>;

  constructor() {
    this.taskRepo = AppDataSource.getRepository(Task);
    this.projectRepo = AppDataSource.getRepository(Project);
    this.userRepo = AppDataSource.getRepository(User);
  }

  /**
   * Create a new task and broadcast to WebSocket
   */
  async createTask(
    taskData: Partial<Task>,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    // Verify project belongs to organization
    const project = await this.projectRepo.findOne({
      where: { id: taskData.project?.id, organizationId },
      relations: ['organization'],
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Create task
    const task = this.taskRepo.create({
      ...taskData,
      project,
      status: taskData.status || 'pending',
      priority: taskData.priority || 1,
    });

    await this.taskRepo.save(task);

    // Load full task with relations for response
    const fullTask = await this.taskRepo.findOne({
      where: { id: task.id },
      relations: ['project', 'assignees', 'printer', 'material'],
    });

    if (fullTask) {
      // Broadcast task creation to WebSocket
      try {
        const wsService = getTaskWebSocketService();
        wsService.broadcastTaskCreated(organizationId, fullTask, userId);
      } catch (error) {
        console.error('Failed to broadcast task creation:', error);
        // Don't fail the operation if WebSocket broadcast fails
      }
    }

    return fullTask || task;
  }

  /**
   * Update a task and broadcast changes
   */
  async updateTask(
    taskId: number,
    updates: Partial<Task>,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    // Find task with organization validation
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project', 'project.organization', 'assignees'],
    });

    if (!task || task.project?.organization?.id !== organizationId) {
      throw new Error('Task not found or access denied');
    }

    // Track changes for WebSocket broadcast
    const changes: Record<string, any> = {};
    const oldStatus = task.status;

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key in task && updates[key as keyof Task] !== undefined) {
        const oldValue = task[key as keyof Task];
        const newValue = updates[key as keyof Task];
        if (oldValue !== newValue) {
          changes[key] = { old: oldValue, new: newValue };
          (task as any)[key] = newValue;
        }
      }
    });

    await this.taskRepo.save(task);

    // Load full task with relations
    const updatedTask = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project', 'assignees', 'printer', 'material'],
    });

    if (updatedTask) {
      try {
        const wsService = getTaskWebSocketService();
        
        // Broadcast general update
        wsService.broadcastTaskUpdated(organizationId, updatedTask, userId, changes);

        // Broadcast specific status change if status was updated
        if (changes.status && oldStatus !== updatedTask.status) {
          wsService.broadcastTaskStatusChanged(
            organizationId,
            taskId,
            oldStatus,
            updatedTask.status,
            userId
          );
        }
      } catch (error) {
        console.error('Failed to broadcast task update:', error);
      }
    }

    return updatedTask || task;
  }

  /**
   * Delete a task and broadcast
   */
  async deleteTask(
    taskId: number,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project', 'project.organization'],
    });

    if (!task || task.project?.organization?.id !== organizationId) {
      throw new Error('Task not found or access denied');
    }

    await this.taskRepo.remove(task);

    // Broadcast deletion
    try {
      const wsService = getTaskWebSocketService();
      wsService.broadcastTaskDeleted(organizationId, taskId, userId);
    } catch (error) {
      console.error('Failed to broadcast task deletion:', error);
    }
  }

  /**
   * Add assignee to task and broadcast
   */
  async addAssignee(
    taskId: number,
    assigneeId: string,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project', 'project.organization', 'assignees'],
    });

    if (!task || task.project?.organization?.id !== organizationId) {
      throw new Error('Task not found or access denied');
    }

    const assignee = await this.userRepo.findOne({
      where: { id: assigneeId, organization: { id: organizationId } },
    });

    if (!assignee) {
      throw new Error('Assignee not found or not in organization');
    }

    // Check if already assigned
    const isAlreadyAssigned = task.assignees.some(a => a.id === assigneeId);
    if (isAlreadyAssigned) {
      throw new Error('User is already assigned to this task');
    }

    task.assignees.push(assignee);
    task.assigneesLastAdded = new Date();
    await this.taskRepo.save(task);

    // Broadcast assignee addition
    try {
      const wsService = getTaskWebSocketService();
      wsService.broadcastAssigneeChange(
        organizationId,
        taskId,
        'assignee_added',
        assigneeId,
        userId
      );
    } catch (error) {
      console.error('Failed to broadcast assignee addition:', error);
    }

    return task;
  }

  /**
   * Remove assignee from task and broadcast
   */
  async removeAssignee(
    taskId: number,
    assigneeId: string,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project', 'project.organization', 'assignees'],
    });

    if (!task || task.project?.organization?.id !== organizationId) {
      throw new Error('Task not found or access denied');
    }

    task.assignees = task.assignees.filter(a => a.id !== assigneeId);
    await this.taskRepo.save(task);

    // Broadcast assignee removal
    try {
      const wsService = getTaskWebSocketService();
      wsService.broadcastAssigneeChange(
        organizationId,
        taskId,
        'assignee_removed',
        assigneeId,
        userId
      );
    } catch (error) {
      console.error('Failed to broadcast assignee removal:', error);
    }

    return task;
  }

  /**
   * Get all tasks for an organization
   */
  async getOrganizationTasks(
    organizationId: string,
    filters?: {
      status?: string;
      projectId?: number;
      assigneeId?: string;
    }
  ): Promise<Task[]> {
    const queryBuilder = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignees', 'assignees')
      .leftJoinAndSelect('task.printer', 'printer')
      .leftJoinAndSelect('task.material', 'material')
      .where('project.organizationId = :organizationId', { organizationId });

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId: filters.projectId });
    }

    if (filters?.assigneeId) {
      queryBuilder.andWhere('assignees.id = :assigneeId', { assigneeId: filters.assigneeId });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get single task
   */
  async getTask(taskId: number, organizationId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: [
        'project',
        'project.organization',
        'assignees',
        'printer',
        'material',
        'wastageLog',
        'progressLogs',
        'workActivityLogs',
      ],
    });

    if (!task || task.project?.organization?.id !== organizationId) {
      throw new Error('Task not found or access denied');
    }

    return task;
  }
}