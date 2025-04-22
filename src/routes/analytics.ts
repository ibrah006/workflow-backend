import { Router } from "express";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { AppDataSource } from "../data-source";
import { LayoffLog } from "../models/LayoffLog";

const router = Router();



router.get('/productivity', async (req, res) : Promise<any> => {
    const { userId, from, to } = req.query;

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    try {
        const workLogs = await AppDataSource
            .getRepository(WorkActivityLog)
            .createQueryBuilder("log")
            .where("log.userId = :userId", { userId })
            .andWhere("log.start BETWEEN :from AND :to", { from: fromDate, to: toDate })
            .getMany();

        const layoffLogs = await AppDataSource
            .getRepository(LayoffLog)
            .createQueryBuilder("layoff")
            .where("layoff.userId = :userId", { userId })
            .andWhere("layoff.start BETWEEN :from AND :to", { from: fromDate, to: toDate })
            .getMany();

        let totalWorkTime = 0;
        let totalLayoff = 0;

        workLogs.forEach(log => {
            const end = log.end ? log.end.getTime() : Date.now();
            totalWorkTime += end - log.start.getTime();
        });

        layoffLogs.forEach(layoff => {
            const layoffEnd = layoff.end ? layoff.end.getTime() : Date.now();
            totalLayoff += layoffEnd - layoff.start.getTime();
        });

        const productiveTime = totalWorkTime - totalLayoff;

        return res.json({
            userId,
            totalWorkTime,
            totalLayoff,
            productiveTime,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to calculate productivity", error });
    }
  });
  
  export default router;