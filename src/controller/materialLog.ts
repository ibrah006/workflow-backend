import { Response, Request } from "express"
import { AppDataSource } from "../data-source";
import { MaterialLog } from "../models/MaterialLog";
import { Task } from "../models/Task";
import { In, MoreThan } from "typeorm";

const taskRepo = AppDataSource.getRepository(Task);
const materialLogRepo = AppDataSource.getRepository(MaterialLog);

export default {
    async getMaterialLogsByProject(
        req: Request,
        res: Response
      ): Promise<any> {
        try {
          const projectId = req.params.projectId;
          const sinceParam = req.query.since as string | undefined;
    
          // Fetch all task IDs belonging to this project
          const tasks = await taskRepo.find({
            where: { project: { id: projectId } },
            select: ["id"],
          });
      
          if (!tasks.length) {
            return res.status(404).json({ message: "No tasks found for project" });
          }
      
          const taskIds = tasks.map((t) => t.id);
      
          // Prepare filter
          const whereClause: any = [
            { materialsUsedTask: { id: In(taskIds) } },
            { materialsEstimatedTask: { id: In(taskIds) } },
          ];
      
          if (sinceParam) {
            const sinceDate = new Date(sinceParam);
            if (isNaN(sinceDate.getTime())) {
              return res.status(400).json({ message: "Invalid since timestamp" });
            }
      
            whereClause.forEach((clause: any) => {
              clause.datetime = MoreThan(sinceDate);
            });
          }
      
          // Query material logs
          const logs = await materialLogRepo.find({
            where: whereClause,
            relations: ["loggedBy", "materialsUsedTask", "materialsEstimatedTask"],
            order: { datetime: "DESC" },
          });
      
          return res.status(200).json(logs);
        } catch (error) {
          console.error("Error fetching material logs by project:", error);
          return res.status(500).json({ message: "Internal Server Error" });
        }
      }
}