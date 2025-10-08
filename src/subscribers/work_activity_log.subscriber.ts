import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, InsertEvent } from "typeorm";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { Task } from "../models/Task";
import { AppDataSource } from "../data-source";

@EventSubscriber()
export class WorkActivityLogSubscriber implements EntitySubscriberInterface<WorkActivityLog> {
  /**
   * Specifies the entity this subscriber listens to.
   */
  listenTo() {
    return WorkActivityLog;
  }

  /**
   * Called after a WorkActivityLog is inserted.
   */
  async afterInsert(event: InsertEvent<WorkActivityLog>): Promise<void> {
    await this.updateTaskWorkActivityLogsLastModified(event);
  }

  /**
   * Called after a WorkActivityLog is updated.
   */
  async afterUpdate(event: UpdateEvent<WorkActivityLog>): Promise<void> {
    await this.updateTaskWorkActivityLogsLastModified(event);
  }

  /**
   * Updates the Task's workActivityLogsLastModifiedAt field
   * to reflect the latest WorkActivityLog.updatedAt value.
   */
  private async updateTaskWorkActivityLogsLastModified(
    event: UpdateEvent<WorkActivityLog> | InsertEvent<WorkActivityLog>
  ): Promise<void> {
    try {
      const log = event.entity;

      // Ensure we have a valid WorkActivityLog entity with a linked Task
      if (!log?.task?.id) return;

      const taskRepo = AppDataSource.getRepository(Task);

      await taskRepo.update(log.task.id, {
        workActivityLogsLastModifiedAt: log.updatedAt,
      });
    } catch (error) {
      console.error("❌ Error updating task's workActivityLogsLastModifiedAt:", error);
    }
  }
}
