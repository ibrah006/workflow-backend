import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { Task } from "../models/Task";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { IsNull } from "typeorm";
import { AttendanceLog } from "../models/AttendanceLog";

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const taskRepo = AppDataSource.getRepository(Task);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const attendanceLogRepo = AppDataSource.getRepository(AttendanceLog);

// Route: Start working on a task
// Requirements:
// - Task must exist and not be completed
// - User must be authenticated
// - User must not already be working on another task
// - User must be assigned to the task, or be an admin
// - If admin starts a task they're not assigned to, auto-assign them
router.post('/:taskId/start', async (req, res): Promise<any> => {
    const userId = (req as any).user.id;
    const taskId = parseInt(req.params.taskId);

    try {
        // Fetch task with assignees loaded
        const task = await taskRepo.findOne({ relations: ['assignees', "project"], where: { id: taskId } });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Prevent starting a task that's already completed
        if (task.dateCompleted) {
            return res.status(400).json({ error: 'Cannot start a completed task' });
        }

        // Fetch user
        const user = await userRepo.findOne({
            where: { id: userId }
        });
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Check if user is already working on another task
        const activeLog = await workActivityLogRepo.findOne({
            where: { user, end: IsNull() }
        });
        if (activeLog) {
            return res.status(400).json({ error: 'You are already working on another task' });
        }

        // Ensure user is assigned to the task or is an admin
        const isAssignee = task.assignees.some(assignee => assignee.id === user.id);
        if (!isAssignee && !user.isAdmin()) {
            return res.status(403).json({ error: 'You are not assigned to this task' });
        }

        // Auto-assign admin if they're not already assigned
        if (!isAssignee && user.isAdmin()) {
            task.assignees.push(user);
            await taskRepo.save(task);
        }

        // Check and make sure the user is clocked into attendance
        var activeAttendanceLog = await attendanceLogRepo.findOneBy({
            user: { id: userId },
            checkOut: IsNull()
        });
        // If user is not clocked in, then log them into attendance
        if (!activeAttendanceLog) {
            activeAttendanceLog = attendanceLogRepo.create({
                user,
                checkIn: new Date(),
            });
    
            await attendanceLogRepo.save(activeAttendanceLog);
        }

        // Create a new work log entry for the task
        const log = workActivityLogRepo.create({
            user,
            task,
            start: new Date(),
        });

        await workActivityLogRepo.save(log);

        // Update task status to in_progress
        task.status = 'in_progress';
        await taskRepo.save(task);

        console.log(`work activity log starting task:`, log);

        if (log.task != null)
            log.task.project = task.project;

        return res.json({
            message: 'Task started successfully',
            attendanceLog: activeAttendanceLog,
            workActivityLog: log
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

  
// Route: Stop working on a task (clock out of task)
// Requirements:
// - Task must exist
// - User must be authenticated
// - User must have started the task (i.e., have a log entry without an end time)
router.post('/end', async (req, res): Promise<any> => {
    const userId = (req as any).user.id;

    const { status, isCompleted } = req.query;

    const statusValue = status? String(status) : null;
    const isCompletedValue = Boolean(isCompleted?? false);

    try {
        // Get the active work log for the current user
        const activeLog = await workActivityLogRepo.findOne({
            where: {
                user: { id: userId },
                end: IsNull(),
            },
            relations: ['task'],
            order: {
                start: 'DESC',
            }
        });

        // No active task found
        if (!activeLog) {
            return res.status(404).json({ error: 'No active task found for the user' });
        }

        const task = activeLog.task!;

        // End the task
        activeLog.end = new Date();
        await workActivityLogRepo.save(activeLog);

        // Update task status
        if (statusValue) task.status = statusValue;
        // Check if task is completed and update it to be an completed task in record
        if (isCompletedValue) {
            task.dateCompleted = new Date();
        }
        await taskRepo.save(task);

        return res.json({ message: 'Task ended successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all tasks assigned to current user
router.get('/me', async (req, res) : Promise<any> => {
    
    const userId = (req as any).user.id;

    const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["tasks", "tasks.project", "tasks.assignees"]
    })

    if (!user) {
        return res.status(401).json({
            message: "Forbidden, tried to fetch user that doesn't exist."
        });
    }

    return res.json(user.tasks);
});

// Get user's active/current task
router.get('/active', async (req, res) : Promise<any> => {

    const userId = (req as any).user.id;

    const activeLog = await workActivityLogRepo.findOne({
        where: {
          user: { id: userId },
          end: IsNull()
        },
        relations: ["task", "tasks.discussionThreads", "tasks.project"]
    });

    res.status(activeLog? 200 : 404).json({
        active: activeLog?.task
    });
});

// Get all tasks
router.get('/', async (req, res) : Promise<any> => {
    const tasks = await taskRepo.find({
        relations: ["assignees", "project"]
    });

    return res.json(tasks);
})

// Get task by ID
router.get('/:id', async (req, res) : Promise<any> => {
    const taskId = parseInt(req.params.id);

    const task = await taskRepo.findOne({
        where: { id: taskId },
        relations: ["assignees", "project"]
    });
    if (!task) {
        return res.status(404).json({
            message: "Task not found!"
        });
    }

    return res.json(task);
})

export default router;