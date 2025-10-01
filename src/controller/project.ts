import { AppDataSource } from "../data-source";
import { ProgressLog } from "../models/ProgressLog";

import { Request, Response } from "express";
import { PROGRESS_RELATIONS } from "./progressLog";
import { Project } from "../models/Project";
import { MoreThan } from "typeorm";
import { Task } from "../models/Task";

const progressLogRepo = AppDataSource.getRepository(ProgressLog);
const projectRepo = AppDataSource.getRepository(Project);
const taskRepo = AppDataSource.getRepository(Task);

export default {
    async getProgressLogsByProject(req: Request, res: Response) : Promise<any> {
        try {
            const projectId = req.params.id;
            const sinceParam = req.query.since as string | undefined;
        
            // Initialize query conditions
            const whereClause: any = {
              project: { id: projectId },
            };
        
            // If 'since' is provided, parse it and add to where clause
            if (sinceParam) {
              const sinceDate = new Date(sinceParam);
        
              if (isNaN(sinceDate.getTime())) {
                return res.status(400).json({ message: 'Invalid "since" timestamp format' });
              }

              whereClause.updatedAt = MoreThan(sinceDate);
            }
        
            const progressLogRepo = AppDataSource.getRepository(ProgressLog);
        
            const logs = await progressLogRepo.find({
              where: whereClause,
              relations: PROGRESS_RELATIONS,
            });
        
            return res.status(200).json(logs);
        } catch (error) {
            console.error('Error fetching progress logs:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    // GET /projects/:id/progress-logs/last-modified
    async getProgressLogLastModified(req: Request, res: Response) : Promise<any> {
        const projectId = req.params.id;

        const project = await projectRepo.findOneBy({
            id: projectId
        });

        if (!project) {
            return res.status(404).send("Project not found");
        }

        res.send({
            lastModifiedAt: project?.progressLogLastModifiedAt
        })
    },

    async getProjectProgressRate(req: Request, res: Response) : Promise<any> {
        const { id: projectId } = req.params;

        try {
            // Get project with all progress logs and tasks
            const project = await projectRepo.findOne({
            where: { id: projectId },
            relations: ['progressLogs'],
            });

            if (!project) {
            return res.status(404).json({ error: 'Project not found' });
            }

            const progressLogs = project.progressLogs || [];

            // Fetch all tasks for the project
            const tasks = await taskRepo.find({
            where: { project: { id: projectId } },
            });

            const now = new Date();
            const progressRates: number[] = [];

            for (const log of progressLogs) {
            const startDate = new Date(log.startDate);
            const dueDate = log.dueDate ? new Date(log.dueDate) : null;

            if (!startDate || !dueDate || startDate >= dueDate) {
                continue; // Skip invalid stages
            }

            const totalDuration = dueDate.getTime() - startDate.getTime();
            const timePassed = now < startDate
                ? 0
                : now > dueDate
                ? totalDuration
                : now.getTime() - startDate.getTime();

            const expected = totalDuration === 0
                ? 1.0
                : Math.min(timePassed / totalDuration, 1.0);

            // Get tasks for this progress log
            const tasksForLog = tasks.filter(
                (t) => t.progressLog && t.progressLog.id === log.id
            );

            let actual = 0.0;

            if (tasksForLog.length > 0) {
                const completedCount = tasksForLog.filter(
                    (t) => t.status.toLowerCase() === 'completed'
                    ).length;
                actual = completedCount / tasksForLog.length;
            } else {
                actual = log.isCompleted ? 1.0 : 0.0;
            }

            const rate = expected === 0 ? 0.0 : Math.min(actual / expected, 1.0);
                progressRates.push(rate);
            }

            const avgRate =
            progressRates.length === 0
                ? 0.0
                : progressRates.reduce((a, b) => a + b, 0) / progressRates.length;

            return res.json({
                projectId,
                progressRate: Number(avgRate.toFixed(4)), // Rounded for consistency
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getProjectsProgressRate(req: Request, res: Response) : Promise<any> {
        const { id: projectId } = req.params;

        try {
            // Get project with all progress logs and tasks
            const projects = await projectRepo.find({
                where: { id: projectId },
                relations: ['progressLogs'],
            });

            var projectsProgressRatesSum: number = 0;

            for (const project of projects) {
                if (!project) {
                    return res.status(404).json({ error: 'Project not found' });
                }
            
                const progressLogs = project.progressLogs || [];
            
                // Fetch all tasks for the project
                const tasks = await taskRepo.find({
                    where: { project: { id: project.id } }, // NOTE: was mistakenly using projectId (global) before
                });
            
                const now = new Date();
                const progressRates: number[] = [];
            
                for (const log of progressLogs) {
                    const startDate = new Date(log.startDate);
                    const dueDate = log.dueDate ? new Date(log.dueDate) : null;
            
                    if (!startDate || !dueDate || startDate >= dueDate) {
                        continue; // Skip invalid stages
                    }
            
                    const totalDuration = dueDate.getTime() - startDate.getTime();
                    const timePassed = now < startDate
                        ? 0
                        : now > dueDate
                            ? totalDuration
                            : now.getTime() - startDate.getTime();
            
                    const expected = totalDuration === 0
                        ? 1.0
                        : Math.min(timePassed / totalDuration, 1.0);
            
                    // Get tasks for this progress log
                    const tasksForLog = tasks.filter(
                        (t) => t.progressLog && t.progressLog.id === log.id
                    );
            
                    let actual = 0.0;
            
                    if (tasksForLog.length > 0) {
                        const completedCount = tasksForLog.filter(
                            (t) => t.status.toLowerCase() === 'completed'
                        ).length;
                        actual = completedCount / tasksForLog.length;
                    } else {
                        actual = log.isCompleted ? 1.0 : 0.0;
                    }
            
                    const rate = expected === 0 ? 0.0 : Math.min(actual / expected, 1.0);
                    progressRates.push(rate);
                }
            
                const avgRate =
                    progressRates.length === 0
                        ? 0.0
                        : progressRates.reduce((a, b) => a + b, 0) / progressRates.length;
            
                projectsProgressRatesSum += avgRate; // Store in percentage
            }
            
            // Final average progress rate across all projects
            const finalAverage = projects.length === 0
                ? 0
                : projectsProgressRatesSum / projects.length;
            
            return res.json({
                progressRate: Number(finalAverage.toFixed(2)), // Rounded for consistency
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getMostRecentlyActiveProjects(req: Request, res: Response) : Promise<any> {
        try {
            const recentProjects = await AppDataSource
            .getRepository(Project)
            .createQueryBuilder('project')
            .select(['project.id'])
            .addSelect(`GREATEST(
              COALESCE(project."updatedAt", TO_TIMESTAMP(0)),
              COALESCE(project."progressLogLastModifiedAt", TO_TIMESTAMP(0))
            )`, 'lastActivity')
            .orderBy(`GREATEST(
              COALESCE(project."updatedAt", TO_TIMESTAMP(0)),
              COALESCE(project."progressLogLastModifiedAt", TO_TIMESTAMP(0))
            )`, 'DESC')
            .limit(3)
            .getRawMany();          
      
          // Convert to key-value object: { "0": id1, "1": id2, ... }
          const projectIdsByOrder: Record<number, string> = {};
          recentProjects.forEach((p, index) => {
            projectIdsByOrder[index] = p.project_id;
          });
      
          return res.json(projectIdsByOrder);
        } catch (error) {
          console.error('Error fetching recent projects:', error);
          return res.status(500).json({ error: 'Internal server error' });
        }
    }

}