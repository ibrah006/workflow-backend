import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { Task } from "../models/Task";

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const taskRepo = AppDataSource.getRepository(Task);

export default {
    async getWorkActivityLogsByTask(req: Request, res: Response): Promise<any> {
      try {
        const taskId = parseInt(req.params.taskId);

        if (isNaN(taskId)) {
          return res.status(400).json({ message: "Invalid task ID." });
        }

        const logs = await workActivityLogRepo.find({
          where: {
            task: { id: taskId },
          },
          relations: ["user", "task"],
          order: {
            start: "DESC",
          },
        });

        return res.status(200).json(logs);
      } catch (error) {
        console.error("Error fetching work activity logs by task:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    },


    async getWorkActivityLogLastModifiedByTask(req: Request, res: Response): Promise<any> {
      try {
        const taskId = parseInt(req.params.taskId);
    
        if (isNaN(taskId)) {
          return res.status(400).json({ message: "Invalid task ID" });
        }
    
        const task = await taskRepo.findOne({
          where: { id: taskId },
          select: ["id", "workActivityLogsLastModifiedAt"],
        });
    
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
    
        return res.json({
          lastModified: task.workActivityLogsLastModifiedAt,
        });
      } catch (error) {
        console.error("Error fetching work activity logs lastModified:", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }
}