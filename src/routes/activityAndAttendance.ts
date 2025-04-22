import { Router } from "express";
import { AttendanceLog } from "../models/AttendanceLog";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();


// Clock in
//users/me/clock-in
// Clock out
//users/me/clock-out
// Start Layoff time
//users/me/layoff/start
// End Layoff time
//users/me/layoff/end
// Start Task
//tasks/:taskId/start
// End Task
//tasks/:taskId/end for ending task

// Conditions
// when clocking in
// // 

const attendanceLogRepo = AppDataSource.getRepository(AttendanceLog);
const userRepo = AppDataSource.getRepository(User);

// Clock in User into attendance
// Clocks in with current time
router.post("/users/me/clock-in", async (req, res) => {
    // TODO: check to see if the actual User is passed in here for req.body.user
    const userId = (req as any).user.id;

    const user = await userRepo.findOneBy({ id: userId });

    const debugInfo = {
        "current user entity from JWT": JSON.stringify((req as any).user),
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
            checkOut: undefined,
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
            attendanceLog,
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

// Clock out User from attendance
router.post("/users/me/clock-out", async (req, res) => {
    const userId = (req as any).user.id;

    const user = await userRepo.findOneBy({ id: userId });

    const debugInfo = {
        "current user entity from JWT": JSON.stringify((req as any).user),
        "request body": JSON.stringify(req.body),
    };

    if (!user) {
        res.status(404).json({
            message: `User with id ${userId} not found`,
            "debug info": debugInfo,
        });
        return;
    }

    // Find the open attendance log (checkOut is null)
    const openLog = await attendanceLogRepo.findOne({
        where: {
            // user: { id: userId },
            // checkOut: null,
            user: { id: userId },
            checkOut: undefined
        },
        relations: ["user"],
        order: {
            checkIn: "DESC", // in case there are multiple (which ideally shouldn't happen)
        },
    });

    if (!openLog) {
        res.status(400).json({
            message: `User ${userId} is not currently clocked in.`,
            "debug info": debugInfo,
        });
        return;
    }

    try {
        openLog.checkOut = new Date();
        await attendanceLogRepo.save(openLog);

        res.status(200).json({
            message: `User ${userId} clocked out successfully.`,
            attendanceLog: openLog,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to clock out user ${userId}`,
            error: err,
            "debug info": debugInfo,
        });
    }
});

export default router;