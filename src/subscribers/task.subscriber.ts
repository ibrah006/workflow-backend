import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, InsertEvent } from "typeorm";
import { Task } from "../models/Task";
import { Project } from "../models/Project";
import { AppDataSource } from "../data-source";

@EventSubscriber()
export class TaskSubscriber implements EntitySubscriberInterface<Task> {
  /**
   * Specifies the entity this subscriber listens to.
   */
  listenTo() {
    return Task;
  }

  /**
   * Called after a task is inserted.
   */
  async afterInsert(event: InsertEvent<Task>): Promise<void> {
    await this.updateProjectTasksLastModified(event);
  }

  /**
   * Called after a task is updated.
   */
  async afterUpdate(event: UpdateEvent<Task>): Promise<void> {
    await this.updateProjectTasksLastModified(event);
  }

  /**
   * Helper function that updates the project's tasksLastModifiedAt
   * whenever one of its tasks is inserted or updated.
   */
  private async updateProjectTasksLastModified(
    event: UpdateEvent<Task> | InsertEvent<Task>
  ): Promise<void> {
    try {
      const task = event.entity;

      if (!task?.project) return; // no linked project — skip

      const projectRepo = AppDataSource.getRepository(Project);

      await projectRepo.update(task.project.id, {
        tasksLastModifiedAt: task.updatedAt,
      });
    } catch (error) {
      console.error("❌ Error updating project's tasksLastModifiedAt:", error);
    }
  }
}
