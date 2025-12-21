import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Project } from "../models/Project";
import { ProgressLog } from "../models/ProgressLog";
import { Between, In, Not } from "typeorm";
import { ProductionReportController } from "../controller/reports";

const projectRepo = AppDataSource.getRepository(Project);
const progressRepo = AppDataSource.getRepository(ProgressLog);

const router = Router();

const productionReportController = new ProductionReportController();

/**
 * @route   GET /api/production/report
 * @desc    Get production report for specified period
 * @query   for - Required: 'today' | 'thisWeek' | 'thisMonth'
 * @access  Private (add your auth middleware)
 */
router.get(
  '/report',
  // Add your authentication middleware here
  // authMiddleware,
  (req, res) => productionReportController.getProductionReport(req, res)
);


// GET /reports/projects?for=thisWeek|thisMonth|thisYear
router.get('/projects', async (req, res) : Promise<any> => {

    const organizationId = (req as any).user.organizationId;
    const period = req.query.for as string;
  
    if (!['thisWeek', 'thisMonth', 'thisYear'].includes(period)) {
      return res.status(400).json({
        error: "Invalid 'for' query param. Use thisWeek | thisMonth | thisYear"
      });
    }
  
    try {
      
  
      // --------------------------------------
      // GET DATE RANGE
      // --------------------------------------
  
      const now = new Date();
      let fromDate: Date;
  
      if (period === 'thisWeek') {
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - now.getDay());
        fromDate.setHours(0, 0, 0, 0);
      }
  
      else if (period === 'thisMonth') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
  
      else {
        fromDate = new Date(now.getFullYear(), 0, 1);
      }
  
      // --------------------------------------
      // BASE WHERE FILTER
      // --------------------------------------
  
      const dateWhere = {
        organizationId,
        createdAt: Between(fromDate, now),
      };
  
      // --------------------------------------
      // PROJECT LISTS
      // --------------------------------------
  
      const [
        activeProjects,
        completedProjects,
        delayedProjects
      ] = await Promise.all([
        projectRepo.count({
          where: {
            ...dateWhere,
            status: Not(In(['cancelled', 'finished']))
          }
        }),
  
        projectRepo.count({
          where: {
            ...dateWhere,
            status: 'finished'
          }
        }),
  
        projectRepo.count({
          where: {
            ...dateWhere,
            status: 'delayed'
          }
        })
      ]);
  
      // --------------------------------------
      // STATUS DISTRIBUTION
      // --------------------------------------
  
      const statusMap = {
        planned: 'pending',
        printing: 'production',
        finishing: 'finishing',
        installing: 'application'
      };
  
      const statusDistribution: Record<string, number> = {};
  
      for (const key of Object.keys(statusMap) as Array<keyof typeof statusMap>) {
        const value = statusMap[key];
        console.log(key, value);
      }
  
      // --------------------------------------
      // ISSUE BREAKDOWN
      // --------------------------------------
  
      const issueRows = await progressRepo
        .createQueryBuilder("log")
        .leftJoin("log.project", "project")
        .select("log.issue", "issue")
        .addSelect("COUNT(*)", "count")
        .where("project.organizationId = :org", { org: organizationId })
        .andWhere("log.issue IS NOT NULL")
        .andWhere("log.startDate BETWEEN :from AND :to", {
            from: fromDate,
            to: now
        })
        .groupBy("log.issue")
        .getRawMany();
  
      const issues: Record<string, number> = {};
  
      issueRows.forEach(row => {
        issues[row.issue] = Number(row.count);
      });
  
      // --------------------------------------
      // RESPONSE
      // --------------------------------------
  
      res.json({
        period,
        range: {
          from: fromDate,
          to: now
        },
  
        projectGroups: {
          active: activeProjects,
          completed: completedProjects,
          delayed: delayedProjects
        },
  
        statusDistribution,
  
        issues
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate project report" });
    }
  });
  

  export default router;