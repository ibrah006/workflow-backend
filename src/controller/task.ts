import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Task } from "../models/Task";
import { TASK_RELATIONS } from "../routes/tasks";

const taskRepo = AppDataSource.getRepository(Task);


export default {
    async getTaskById(req: Request, res: Response): Promise<any> {
        try {
          const taskId = parseInt(req.params.taskId);
          if (isNaN(taskId)) {
            return res.status(400).json({ message: "Invalid task ID" });
          }
    
          // Parse timestamps if provided
          const clientUpdatedAt = req.query.updatedAt
            ? new Date(req.query.updatedAt as string)
            : null;
          const clientActivityLogLastModified = req.query.activityLogLastModified
            ? new Date(req.query.activityLogLastModified as string)
            : null;
          const clientAssigneeLastAdded = req.query.assigneeLastAdded
            ? new Date(req.query.assigneeLastAdded as string)
            : null;
    
          // Select timestamps and minimal relations first
          const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: TASK_RELATIONS,
          });
    
          if (!task) {
            return res.status(404).json({ message: "Task not found" });
          }
    
          // Compare timestamps to determine if the client data is fresh
          const shouldSendFullTask =
            !clientUpdatedAt ||
            !clientActivityLogLastModified ||
            !clientAssigneeLastAdded ||
            (task.updatedAt && clientUpdatedAt < task.updatedAt) ||
            (task.workActivityLogsLastModifiedAt &&
              clientActivityLogLastModified &&
              clientActivityLogLastModified < task.workActivityLogsLastModifiedAt) ||
            (task.assigneesLastAdded &&
              clientAssigneeLastAdded &&
              clientAssigneeLastAdded < task.assigneesLastAdded);
    
          if (!shouldSendFullTask) {
            // Client data is up to date
            return res.status(204).send(); // No Content
          }
    
          // Return the complete Task object
          return res.status(200).json(task);
        } catch (error) {
          console.error("Error fetching task by ID:", error);
          return res.status(500).json({ message: "Internal Server Error" });
        }
    }
}