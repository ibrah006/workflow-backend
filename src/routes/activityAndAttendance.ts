import { Router } from "express";
import { AttendanceLog } from "../models/AttendanceLog";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";

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
        "current user entity": JSON.stringify(req.body.user)
    };

    if (!user) {
        res.status(404).json({
            message: `User with id ${userId} not found`,
            "debug info": debugInfo
        });
        return;
    }

    try {
        const attendanceLog = attendanceLogRepo.create({
            user,
            checkIn: new Date(),
        });
        
        await attendanceLogRepo.save(attendanceLog);
    } catch(err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to log clock in for user ${userId}`,
            error: err,
            "debug info": debugInfo
        });
    }
});

export default router;