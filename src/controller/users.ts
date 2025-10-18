import { Request, Response } from "express";
import { Task } from "../models/Task";
import { AppDataSource } from "../data-source";
import { loginUser } from "../services/authService";

const taskRepo = AppDataSource.getRepository(Task);

export default {
    async relogin(req: Request, res: Response): Promise<any> {

      const email = (req as any).user.email;

      const authHeader = req.headers.authorization;
      if (!authHeader) {
          res.status(401).json({ error: 'Token missing' });
          return;
      }

      const existingJwtToken = authHeader.split(' ')[1];

      try {
        const { token, user } = await loginUser(String(email), undefined, existingJwtToken);
        res.json({ token, user });
      } catch(err) {
          console.error(err);
          res.status(401).json({ error: err })
      }
    },
    async getTaskAssignees(req: Request, res: Response): Promise<any> {
        try {
          const taskId = parseInt(req.params.taskId);
      
          if (isNaN(taskId)) {
            return res.status(400).json({ message: "Invalid task ID." });
          }
      
          const addedSinceParam = req.query.addedSince as string | undefined;
    
      
          const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ["assignees"],
            select: ["id", "assigneesLastAdded"], // Include only necessary columns + relation
          });
      
          if (!task) {
            return res.status(404).json({ message: "Task not found." });
          }
      
          // If client passed addedSince, compare it with task.assigneesLastAdded
          if (addedSinceParam) {
            const addedSinceDate = new Date(addedSinceParam);
      
            if (isNaN(addedSinceDate.getTime())) {
              return res.status(400).json({ message: "Invalid 'addedSince' timestamp format." });
            }
      
            // If the client's timestamp is newer or equal, return empty array
            if (
              task.assigneesLastAdded &&
              addedSinceDate >= new Date(task.assigneesLastAdded)
            ) {
              return res.status(200).json([]); // No new assignees since client's last sync
            }
          }
      
          // Otherwise, return all assignees for this task
          return res.status(200).json(task.assignees ?? []);
        } catch (error) {
          console.error("❌ Error fetching task assignees:", error);
          return res.status(500).json({ message: "Internal Server Error" });
        }
    }
}