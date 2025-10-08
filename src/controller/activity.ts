import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { WorkActivityLog } from "../models/WorkActivityLog";

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);

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
    }
}