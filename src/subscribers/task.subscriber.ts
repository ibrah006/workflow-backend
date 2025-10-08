import {
    EventSubscriber,
    EntitySubscriberInterface,
    UpdateEvent,
    DataSource,
  } from 'typeorm';
  import { Task } from '../models/Task';
  import { Project } from '../models/Project';
  
  @EventSubscriber()
  export class TaskSubscriber implements EntitySubscriberInterface<Task> {
    constructor(dataSource: DataSource) {
      dataSource.subscribers.push(this);
    }
  
    listenTo() {
      return Task;
    }
  
    async afterUpdate(event: UpdateEvent<Task>): Promise<void> {
      const task = event.entity;
  
      // Only proceed if project exists and task was updated
      if (!task || !task.project?.id) return;
  
      const projectId = task.project.id;
  
      const latestTask = await event.manager
        .getRepository(Task)
        .createQueryBuilder('task')
        .where('task.projectId = :projectId', { projectId })
        .orderBy('task.updatedAt', 'DESC')
        .limit(1)
        .getOne();
  
      if (latestTask) {
        await event.manager
          .getRepository(Project)
          .update(projectId, {
            tasksLastModifiedAt: latestTask.updatedAt,
          });
      }
    }
  }
  