import { Router } from "express";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { AppDataSource } from "../data-source";
import { LayoffLog } from "../models/LayoffLog";
import { User } from "../models/User";
import { AttendanceLog } from "../models/AttendanceLog";

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const attendanceLogRepo = AppDataSource.getRepository(AttendanceLog);
const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const layoffLogRepo = AppDataSource.getRepository(LayoffLog);

// Staff Productivity Summary
router.get('/staff-productivity-summary', async (_req, res) : Promise<any> => {
    try {
        const users = await userRepo.find();
        const productivitySummary = [];

        for (const user of users) {
            const attendance = await attendanceLogRepo.find({
                where: { user: { id: user.id } },
                relations: ['user']
            });

            const workLogs = await workActivityLogRepo.find({
                where: { user: { id: user.id } },
                relations: ['user']
            });

            let totalAttendanceTime = 0;
            for (const log of attendance) {
                if (log.checkIn && log.checkOut) {
                    console.log(`type of checkout time: ${log.checkOut}`);
                    totalAttendanceTime += (log.checkOut.getTime() - log.checkIn.getTime());
                }
            }

            let totalWorkTime = 0;
            for (const log of workLogs) {
                if (log.start && log.end) {
                    totalWorkTime += (log.end.getTime() - log.start.getTime());
                }
            }

            const productivity = totalAttendanceTime > 0
                ? ((totalWorkTime / totalAttendanceTime) * 100).toFixed(2)
                : "0";

            productivitySummary.push({
                user: user.name,
                totalAttendanceTimeMs: totalAttendanceTime,
                totalWorkTimeMs: totalWorkTime,
                productivity: `${productivity}%`
            });
        }

        return res.json({ productivitySummary });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Layoff Analysis by User/Project
router.get('/layoff-analysis', async (_req, res) : Promise<any> => {
    try {
        const layoffLogs = await layoffLogRepo.find({
            relations: ['user']
        });

        const summary: Record<string, number> = {};

        for (const log of layoffLogs) {
            if (!log.end) continue;

            const userKey = `${log.user.name}`;

            const duration = log.end.getTime() - log.start.getTime();
            summary[userKey] = (summary[userKey] || 0) + duration;
        }

        return res.json({ layoffDurationsMsByUser: summary });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Time Spent Per Task / Project
router.get('/time-spent', async (_req, res) : Promise<any> => {
    try {
        const workLogs = await workActivityLogRepo.find({
            relations: ['task', 'task.project']
        });

        const taskSummary: Record<string, number> = {};
        const projectSummary: Record<string, number> = {};
        
        var deletedTaskIndex = 0;
        var deletedProjectIndex = 0;
        for (const log of workLogs) {
            if (!log.end) continue;

            const logTask = log.task;

            var taskKey: string;
            var projectKey: string;
            
            if (logTask) {
                taskKey = `${logTask.name}`;
                if (logTask.project) {
                    projectKey = logTask.project.name;
                } else {
                    deletedProjectIndex++;
                    projectKey = `DELETED_PRJ${deletedProjectIndex}`;
                }
            } else {
                deletedTaskIndex++;
                taskKey = `DELETED_TSK${deletedTaskIndex}`;
                projectKey = `UNKNOWN_PRJ_DUETO_DEL_TSK${deletedTaskIndex}`;
            }

            const duration = log.end.getTime() - log.start.getTime();
            taskSummary[taskKey] = (taskSummary[taskKey] || 0) + duration;
            projectSummary[projectKey] = (projectSummary[projectKey] || 0) + duration;
        }

        return res.json({
            timeSpentPerTaskMs: taskSummary,
            timeSpentPerProjectMs: projectSummary
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Wastage Indicator (Placeholder)
router.get('/wastage-indicator', async (_req, res) : Promise<any> => {
    return res.json({
        message: 'Wastage indicator coming soon',
        indicator: null
    });
});

  
export default router;