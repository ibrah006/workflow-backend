import { Response, Request } from "express"
import { AppDataSource } from "../data-source";
import { MaterialLog } from "../models/MaterialLog";
import { Task } from "../models/Task";
import { In, MoreThan } from "typeorm";

const taskRepo = AppDataSource.getRepository(Task);
const materialLogRepo = AppDataSource.getRepository(MaterialLog);

export default {
  async getMaterialLogsByProject(req: Request, res: Response): Promise<any> {
    try {
      const projectId = req.params.projectId;
      const sinceParam = req.query.since as string | undefined;
  
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
  
      // Validate optional `since` query param
      let sinceDate: Date | undefined;
      if (sinceParam) {
        sinceDate = new Date(sinceParam);
        if (isNaN(sinceDate.getTime())) {
          return res.status(400).json({ message: "Invalid 'since' timestamp" });
        }
      }
  
      // Build where clause
      const whereClause: any = { project: { id: projectId } };
      if (sinceDate) {
        whereClause.dateCreated = MoreThan(sinceDate);
      }
  
      // Query material logs
      const logs = await materialLogRepo.find({
        where: whereClause,
        relations: ["loggedBy", "project"],
        order: { dateCreated: "DESC" },
      });
  
      return res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching material logs by project:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }  
}