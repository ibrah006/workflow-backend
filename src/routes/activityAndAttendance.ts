import { Router } from "express";
import { AttendanceLog } from "../models/AttendanceLog";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/authMiddleware";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { Task } from "../models/Task";
import { LayoffLog } from "../models/LayoffLog";
import { Brackets, IsNull } from "typeorm";

import { startOfToday, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";

import activityController from "../controller/activity";

const router = Router();


// Clock in POST
//users/me/clock-in
// Clock out POST
//users/me/clock-out
// Start Layoff time POST
//users/me/layoff/start
// End Layoff time POST
//users/me/layoff/end
// Start Task POST
//tasks/:taskId/start
// End Task POST
//tasks/:taskId/end

// Conditions
// when clocking in
// // 

const attendanceLogRepo = AppDataSource.getRepository(AttendanceLog);
const userRepo = AppDataSource.getRepository(User);
const taskRepo = AppDataSource.getRepository(Task);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const layoffLogRepo = AppDataSource.getRepository(LayoffLog);


// GET all work activity logs for a specific task
router.get("/task/:taskId/", activityController.getWorkActivityLogsByTask);

router.get("/task/:taskId/last-modified", activityController.getWorkActivityLogLastModifiedByTask);

// Clock in User into attendance
// Clocks in with current time
router.post("/users/me/clock-in", async (req, res) => {
    // TODO: check to see if the actual User is passed in here for req.body.user
    const userId = (req as any).user.id;

    const user = await userRepo.findOneBy({ id: userId });

    const debugInfo = {
        "current user id": userId,
        "request body": JSON.stringify(req.body),
    };

    if (!user) {
        res.status(404).json({
            message: `User with id ${userId} not found`,
            "debug info": debugInfo,
        });
        return;
    }

    // Check for an existing attendance log without a checkOut
    const openLog = await attendanceLogRepo.findOne({
        where: {
            user: { id: userId },
            checkOut: IsNull(),
        },
        relations: ["user"],
    });

    if (openLog) {
        res.status(400).json({
            message: `User ${userId} is already clocked in.`,
            "existing log id": openLog.id,
            "check in time": openLog.checkIn,
            "debug info": debugInfo,
        });
        return;
    }

    try {
        const attendanceLog = attendanceLogRepo.create({
            user,
            checkIn: new Date(),
        });

        await attendanceLogRepo.save(attendanceLog);

        res.status(201).json({
            message: `User ${userId} clocked in successfully.`,
            log: {
                ...attendanceLog,
                userId: userId
            },
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to log clock in for user ${userId}`,
            error: err,
            "debug info": debugInfo,
        });
    }
});

router.post("/users/me/clock-out", async (req, res): Promise<any> => {
    const userId = (req as any).user.id;

    const user = await userRepo.findOneBy({ id: userId });

    const debugInfo = {
        "current user entity from JWT": JSON.stringify((req as any).user),
        "request body": JSON.stringify(req.body),
    };

    if (!user) {
        return res.status(404).json({
            message: `User with id ${userId} not found`,
            "debug info": debugInfo,
        });
    }

    try {
        const now = new Date();

        // =====================
        // ✅ Attendance Checkout
        // =====================
        const openAttendanceLog = await attendanceLogRepo.findOne({
            where: {
                user: { id: userId },
                checkOut: IsNull(),
            },
            relations: ["user"],
            // order: {
            //     checkIn: "DESC",
            // },
        });

        if (!openAttendanceLog) {
            return res.status(400).json({
                message: `User ${userId} is not currently clocked in.`,
                "debug info": debugInfo,
            });
        }

        openAttendanceLog.checkOut = now;
        await attendanceLogRepo.save(openAttendanceLog);

        // =====================
        // ✅ Active Task Log (Work Activity Log) End
        // =====================
        const activeTaskLog = await workActivityLogRepo.findOne({
            where: {
                user: { id: userId },
                end: IsNull(),
            },
            relations: ["task"],
            order: {
                start: "DESC",
            },
        });

        if (activeTaskLog) {
            activeTaskLog.end = now;
            await workActivityLogRepo.save(activeTaskLog);

            const task = activeTaskLog.task;
            if (task && task.status === "in_progress") {
                task.status = "in_review";
                await taskRepo.save(task);
            }
        }

        // =====================
        // ✅ End Layoff (if any)
        // =====================
        const activeLayoffLog = await layoffLogRepo.findOne({
            where: {
                user: { id: userId },
                end: IsNull(),
            },
            order: {
                start: "DESC",
            },
        });

        if (activeLayoffLog) {
            activeLayoffLog.end = now;
            await layoffLogRepo.save(activeLayoffLog);
        }

        return res.status(200).json({
            message: `User ${userId} clocked out successfully.`,
            attendanceLog: openAttendanceLog,
            taskLog: activeTaskLog || null,
            layoffLog: activeLayoffLog || null,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: `Failed to clock out user ${userId}`,
            error: err,
            "debug info": debugInfo,
        });
    }
});

// Start Layoff
router.post('/users/me/layoff/start', async (req, res): Promise<any> => {
    const userId = (req as any).user.id;

    try {
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is clocked in (attendance log with no 'end')
        const activeAttendance = await attendanceLogRepo.findOne({
            where: {
                user: { id: userId },
                checkOut: IsNull()
            },
            relations: ['user']
        });

        if (!activeAttendance) {
            return res.status(400).json({ error: 'You must be clocked in to start a layoff period' });
        }

        // Check if there's an active layoff (end is still undefined)
        const activeLayoff = await layoffLogRepo.findOne({
            where: {
                user: { id: userId },
                end: IsNull()
            },
            relations: ['user']
        });

        if (activeLayoff) {
            return res.status(400).json({ error: 'You are already in a layoff period' });
        }

        // Create a new layoff log with start time
        const layoffLog = layoffLogRepo.create({
            user,
            start: new Date()
        });

        await layoffLogRepo.save(layoffLog);

        return res.status(201).json({
            message: 'Layoff started successfully',
            layoffLog
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// End Layoff
router.post('/users/me/layoff/end', async (req, res): Promise<any> => {
    const userId = (req as any).user.id;

    try {
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find active layoff for this user
        const activeLayoff = await layoffLogRepo.findOne({
            where: {
                user: { id: userId },
                end: IsNull()
            },
            relations: ['user']
        });

        if (!activeLayoff) {
            return res.status(400).json({ error: 'You are not currently in a layoff period' });
        }

        activeLayoff.end = new Date();
        await layoffLogRepo.save(activeLayoff);

        return res.status(200).json({
            message: 'Layoff ended successfully',
            layoffLog: activeLayoff
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Attendance log analysis
// 1. Calculate how long AttendanceLog periods have lasted for
router.get("/attendance/analysis", async (req, res): Promise<any> => {
    const dataFor = req.query.for;
    const now = new Date();

    let start: Date;
    if (dataFor === "today") {
        start = startOfToday();
    } else if (dataFor === "pastWeek") {
        start = startOfWeek(now, { weekStartsOn: 1 });
    } else if (dataFor === "pastMonth") {
        start = startOfMonth(now);
    } else {
        return res.status(400).json({
            message: `Unsupported data-for: '${dataFor}'. Only 'today', 'pastWeek', and 'pastMonth' are supported.`
        });
    }

    // Scoped to current organization
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    // Get all logs that overlap with the time window — scoped to the same organization
    const overlappingLogs = await attendanceLogRepo
        .createQueryBuilder("log")
        .leftJoinAndSelect("log.user", "user")
        .where("user.organizationId = :organizationId", { organizationId })
        .andWhere(
        new Brackets((qb) => {
            qb.where('"log"."checkOut" IS NULL')
            .orWhere('"log"."checkOut" >= :start AND "log"."checkIn" <= :end', {
                start,
                end: now,
            });
        })
        )
        .getMany();

    let attendanceSeconds = 0;

    for (const log of overlappingLogs) {
        const checkIn = new Date(log.checkIn);
        const checkOut = log.checkOut ? new Date(log.checkOut) : now;

        const clippedStart = checkIn < start ? start : checkIn;
        const clippedEnd = checkOut > now ? now : checkOut;

        const duration = (clippedEnd.getTime() - clippedStart.getTime()) / 1000;
        if (duration > 0) {
            attendanceSeconds += duration;
        }
    }

    res.json({
        attendanceInSeconds: Math.floor(attendanceSeconds),
    });
});

// Get all Attendance logs
router.get("/attendance", adminOnlyMiddleware, async (req, res)=> {
    const logs = attendanceLogRepo.find({
        relations: ["user"]
    });

    res.json(logs);
});

router.get("/me/attendance/active", async (req, res) : Promise<any> => {
    const userId = (req as any).user.id;
    const activeLog = await attendanceLogRepo.findOne({
        where: { user: { id: userId }, checkOut: IsNull() }
    });

    return res.status( activeLog? 200 : 404 ).json({
        active: activeLog? {
            ...activeLog,
            "userId": userId
        } : null
    });
});

router.get("/me/work-activity/active", async (req, res) => {
    const userId = (req as any).user.id;
    const activeLog = await workActivityLogRepo.findOne({
        where: {
            user: { id: userId },
            end: IsNull()
        },
        relations: ["task", "task.assignees", "task.project"]
    });

    res.status(activeLog? 200 : 404).json({
        "active": activeLog
    })
});

// Get All layoff logs
router.get("/layoff", async (req, res) => {
    const logs = await layoffLogRepo.find();
    res.json(logs);
});

export default router;