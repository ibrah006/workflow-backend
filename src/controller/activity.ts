import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { Task } from "../models/Task";
import { MoreThan } from "typeorm";

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const taskRepo = AppDataSource.getRepository(Task);

export default {
  async getWorkActivityLogsByTask(req: Request, res: Response): Promise<any> {
    try {
      const taskId = parseInt(req.params.taskId);
  
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID." });
      }
  
      const sinceParam = req.query.since as string | undefined;
  
      // Build the where clause
      const whereClause: any = {
        task: { id: taskId },
      };
  
      // If 'since' query param exists, parse and apply filter
      if (sinceParam) {
        const sinceDate = new Date(sinceParam);
  
        if (isNaN(sinceDate.getTime())) {
          return res.status(400).json({ message: 'Invalid "since" timestamp format.' });
        }
  
        // Filter logs that were updated after the given date
        whereClause.updatedAt = MoreThan(sinceDate);
      }
  
      // Fetch logs with relations
      const logs = await workActivityLogRepo.find({
        where: whereClause,
        relations: ["user", "task", "user.department"],
        order: {
          start: "DESC",
        },
      });
  
      return res.status(200).json(logs);
    } catch (error) {
      console.error("❌ Error fetching work activity logs by task:", error);
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