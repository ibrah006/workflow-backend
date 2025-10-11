import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { Task } from "../models/Task";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { IsNull, MoreThan } from "typeorm";
import { AttendanceLog } from "../models/AttendanceLog";
import { Project } from "../models/Project";

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const taskRepo = AppDataSource.getRepository(Task);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const attendanceLogRepo = AppDataSource.getRepository(AttendanceLog);

const projectRepo = AppDataSource.getRepository(Project);

// --- define any task relations you want eagerly loaded
const TASK_RELATIONS = ["assignees", "project", "progressLog", "workActivityLogs", "workActivityLogs.user", "workActivityLogs.task"];

export async function notifyProjectAboutLastTaskChange(projectId: string, lastModified: Date) : Promise<void> {
    await projectRepo.update(
        projectId,
        {
            tasksLastModifiedAt: lastModified
        }
    )
}

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
        // const isAssignee = task.assignees.some(assignee => assignee.id === user.id);
        // if (!isAssignee && !user.isAdmin()) {
        //     return res.status(403).json({ error: 'You are not assigned to this task' });
        // }

        // Auto-assign admin if they're not already assigned
        // if (!isAssignee && user.isAdmin()) {
        //     task.assignees.push(user);
        //     await taskRepo.save(task);
        // }
        task.assignees.push(user);
        task.assigneesLastAdded = new Date();
        await taskRepo.save(task);

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

        const savedLog = await workActivityLogRepo.save(log);

        await taskRepo.save(task);

        await notifyProjectAboutLastTaskChange(task.project.id, new Date());

        console.log(`work activity log starting task:`, log);

        if (log.task != null)
            log.task.project = task.project;

        return res.json({
            message: 'Task started successfully',
            attendanceLog: activeAttendanceLog,
            workActivityLog: savedLog,
            updatedAt: task.updatedAt
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

// Mark the task status as completed
// no body required at all
router.put('/:id/markCompleted', async (req, res) : Promise<any> => {
    let dateCompleted = new Date();
    try {
        const taskId = parseInt(req.params.id);
        await taskRepo.update({
            id: taskId
        }, {
            status: 'completed',
            dateCompleted
        });

        const task = await taskRepo.findOne({
            where:{id: taskId},
            relations: ["project"]
        });

        await notifyProjectAboutLastTaskChange(task!.project.id, task!.updatedAt);
    } catch(err) {
        return res.status(400).send({message: "Error trying to mark task as completed"});
    }

    res.json({
        dateCompleted,
        updatedAt: dateCompleted
    });
})

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

/**
 * GET /tasks/project/:projectId
 * Optional query param: ?since=<ISO timestamp>
 *
 * Returns all tasks for a project, or only those updated after the "since" timestamp.
 */
router.get("/project/:projectId", async (req: Request, res: Response): Promise<any> => {
    try {
      const projectId = req.params.projectId;
      const sinceParam = req.query.since as string | undefined;
  
      // --- validate timestamp if provided
      let whereClause: any = {
        project: { id: projectId },
      };
  
      if (sinceParam) {
        const sinceDate = new Date(sinceParam);
        if (isNaN(sinceDate.getTime())) {
          return res.status(400).json({ message: 'Invalid "since" timestamp format' });
        }
        whereClause.updatedAt = MoreThan(sinceDate);
      }

  
      // --- perform query
      const tasks = await taskRepo.find({
        where: whereClause,
        relations: TASK_RELATIONS,
        order: { updatedAt: "DESC" },
      });
  
      return res.status(200).json(tasks);
    } catch (error) {
      console.error("Error fetching tasks by project:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });

/**
 * GET /tasks/:projectId/last-modified
 * Returns the project's tasksLastModifiedAt timestamp.
 */
router.get("/:projectId/last-modified", async (req, res) : Promise<any> => {
    try {
      const projectId = req.params.projectId;
  
      const project = await projectRepo.findOne({
        where: { id: projectId },
        select: ["id", "tasksLastModifiedAt"],
      });
  
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
  
      return res.json({
        lastModified: project.tasksLastModifiedAt,
      });
    } catch (error) {
      console.error("Error fetching project's task lastModified:", error);
      return res
        .status(500)
        .json({ message: "Internal server error" });
    }
});  

export default router;