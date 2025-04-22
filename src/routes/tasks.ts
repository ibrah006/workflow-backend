import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { Task } from "../models/Task";
import { WorkActivityLog } from "../models/WorkActivityLog";

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const taskRepo = AppDataSource.getRepository(Task);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);

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
        const task = await taskRepo.findOne({ relations: ['assignees'], where: { id: taskId } });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Prevent starting a task that's already completed
        if (task.dateCompleted) {
            return res.status(400).json({ error: 'Cannot start a completed task' });
        }

        // Fetch user
        const user = await userRepo.findOne(userId);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Check if user is already working on another task
        const activeLog = await workActivityLogRepo.findOne({
            where: { user, end: undefined }
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

        return res.json({ message: 'Task started successfully' });
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
router.post('/:taskId/end', async (req, res): Promise<any> => {
    const userId = (req as any).user.id;
    const taskId = parseInt(req.params.taskId);

    try {
        // Fetch the task
        const task = await taskRepo.findOne({ where: { id: taskId } });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Fetch user
        const user = await userRepo.findOne(userId);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Find the user's active work log on this task
        const activeLog = await workActivityLogRepo.findOne({
            where: { task, user, end: undefined }
        });
        if (!activeLog) {
            return res.status(400).json({ error: 'You have not started this task yet' });
        }

        // Set end time to now and save
        activeLog.end = new Date();
        await workActivityLogRepo.save(activeLog);

        // Update task status to in_review
        task.status = 'in_review';
        await taskRepo.save(task);

        return res.json({ message: 'Task ended successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;