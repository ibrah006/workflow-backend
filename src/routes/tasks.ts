import { Request, Response, Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { Task } from "../models/Task";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { Between, IsNull, MoreThan } from "typeorm";
import { AttendanceLog } from "../models/AttendanceLog";
import { Project } from "../models/Project";
import taskController from '../controller/task';
import { MaterialService, StockOutCommitTransactionDto } from "../services/materialService";
import { Printer, PrinterStatus } from "../models/Printer";
import { v4 as uuidv4 } from 'uuid';
import projectController, { PROJECT_GET_RELATIONS } from "../controller/project";
import { StockTransaction, TransactionType } from "../models/StockTransaction";
import { Material } from "../models/Material";
import { ProgressLog } from "../models/ProgressLog";

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const taskRepo = AppDataSource.getRepository(Task);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const attendanceLogRepo = AppDataSource.getRepository(AttendanceLog);

const projectRepo = AppDataSource.getRepository(Project);

const materialService = new MaterialService()

const printerRepo = AppDataSource.getRepository(Printer);

const progressLogRepo = AppDataSource.getRepository(ProgressLog);

// --- define any task relations you want eagerly loaded
export const TASK_RELATIONS = ["assignees", "project", "progressLogs", "workActivityLogs", "workActivityLogs.user", "workActivityLogs.task", 'material', 'stockTransaction'];

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
            where: { user: { id: user.id }, end: IsNull() }
        });
        if (activeLog) {
            return res.status(400).json({ error: 'You are already working on another task' });
        }

        // Ensure user is assigned to the task or is an admin
        const isAssignee = task.assignees.some(assignee => assignee.id === user.id);
        // if (!isAssignee && !user.isAdmin()) {
        //     return res.status(403).json({ error: 'You are not assigned to this task' });
        // }

        // Auto-assign admin if they're not already assigned
        // if (!isAssignee && user.isAdmin()) {
        //     task.assignees.push(user);
        //     await taskRepo.save(task);
        // }
        
        if (!isAssignee) {
            task.assignees.push(user);
            task.assigneesLastAdded = new Date();
        }

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

        relations: ["task", "task.discussionThreads", "task.project", "task.progressLogs", "task.assignees", "task.workActivityLogs"]
    });

    res.status(activeLog? 200 : 404).json({
        active: activeLog?.task
    });
});

// Get all tasks
// Scoped to current organization
router.get('/', async (req, res) : Promise<any> => {

    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    const tasks = await taskRepo.find({
        relations: [...TASK_RELATIONS],
        where: { project: { organizationId } }
    });

    return res.json(tasks);
})

// Get task by ID
router.get("/:taskId", (req, res) => taskController.getTaskById(req, res));

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

// Get today's schedule print jobs
router.get("/production/today", async (req, res) : Promise<any> => {
    try {
        const organizationId = (req as any).user.organizationId;

        // Get today's date at midnight
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Get tomorrow's date at midnight
        const startOfTomorrow = new Date();
        startOfTomorrow.setDate(startOfToday.getDate() + 1);
        startOfTomorrow.setHours(0, 0, 0, 0);

        // Today's tasks
        const tasks = await taskRepo.find({
            where: { project: { organizationId }, productionStartTime: Between(startOfToday, startOfTomorrow) },
            relations: TASK_RELATIONS
        });

        res.json({
            message: "Today's Schedule for Production Team",
            tasks
        });
    } catch(error) {
        console.error("Error fetching today's schedule for production team", error);
        return res
            .status(500)
            .json({ message: "Internal server error" });
    }
});

router.put("/:id/assign-printer", async (req, res) => {
    const taskId = Number(req.params.id);

    const printerId = req.body.printerId;

    const userId = (req as any).user.id;

    try {
        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['stockTransaction', 'project']
        });

        if (!task) {
            res.status(404).json({
                message: `Task not found`
            });
            return;
        }

        // Find the printer
        const printer = await printerRepo.findOne({
            where: { id: printerId }
        });
    
        if (!printer) {
            res.status(404).json({
                message: `Printer not found`
            });
            return;
        } else if (printer.currentTaskId != null) {
            res.status(400).json({
                message: `Printer busy with another Job`
            });
            return;
        }

        // Check if printer is available
        if (printer.status !== PrinterStatus.ACTIVE) {
            res.status(400).json({
            message: `Printer is not available (status: ${printer.status})`
            });
            return;
        }

        const isJobResume = task.status === "paused";
        const rollbackProductionStartTime = task.actualProductionStartTime;

        // Using transaction to ensure atomicity
        await AppDataSource.transaction(async (transactionalEntityManager) => {
            // Update task
            task.printerId = printerId;
            task.actualProductionStartTime = new Date();
            task.status = 'printing';
            await transactionalEntityManager.save(task);
    
            // Update printer
            printer.currentTaskId = task.id;
            printer.taskAssignedAt = new Date(); // Track when task was assigned
            await transactionalEntityManager.save(printer);
        });
        
        if (!isJobResume) {
            try {
                // Commit the existing stock out transaction
                await materialService.stockOut({
                    quantity: task.stockTransaction.quantity,
                    projectId: task.project.id,
                    taskId: task.id,
                    userId: userId,
                    transactionId: task.stockTransactionId
                } as StockOutCommitTransactionDto);
            } catch(err) {
                // Rollback
                await AppDataSource.transaction(async (transactionalEntityManager) => {
                    // Update task
                    task.printerId = null;
                    task.actualProductionStartTime = null;
                    task.status = 'pending';
                    await transactionalEntityManager.save(task);
            
                    // Update printer
                    printer.currentTaskId = null;
                    printer.taskAssignedAt = null; // Track when task was assigned
                    await transactionalEntityManager.save(printer);
                });
                
                throw `Issue: ${err}`;
            }
        }

        res.json({
            message: `Successfully assigned printer to task and started print job`
        });
    } catch(e) {
        res.status(500).json({
            message: `Failed to assign printer to task: ${e}`
        });
    }
});

router.put("/:id/unassign-printer", async (req, res) => {
    const taskId = Number(req.params.id);

    const status = req.body.status;

    try {
        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['printer', 'printer.currentTask']
        });

        if (!task) {
            res.status(404).json({
                message: `Task not found`
            });
            return;
        }
        
        if (!task.printerId) {
            res.status(404).json({
                message: `No Printer assigned to unassign`
            });
            return;
        }

        if (!task.printer) {
            res.status(404).json({
                message: `Printer not found`
            });
            return;
        }

        const printerId = task.printerId;

        task.printerId = null;
        task.actualProductionEndTime = new Date();
        task.status = status;

        await taskRepo.save(task);

        const printer = await printerRepo.findOne({
            where: { id: printerId }
        });

        console.log("debug log 101, printer:", printer);

        if (printer) {
            printer.currentTaskId = null;
            printer.currentTask = undefined;
            await printerRepo.save(printer);
        }

        res.json({
            message: `Successfully unassigned printer to task`
        });
    } catch(e) {
        console.log(`debug log 101, Failed to unassign printer from task, error: ${e}`);
        res.status(500).json({
            message: `Failed to assign printer to task: ${e}`
        });
    }
});

router.put("/:id/progress-stage", async (req, res)=> {
    const taskId = Number(req.params.id);
    const organizationId = (req as any).user.organizationId;

    const newStatus = req.body.newStatus;

    if (!newStatus) {
        res.status(400).json({
            message: "New Status required"
        })
        return;
    }

    if (!organizationId) {
        res.status(401).json({
            message: "FORBIDDEN ACCESS"
        })
        return;
    }

    const task = await taskRepo.findOne({
        where: {
            id: taskId,
            project: {
                organizationId: organizationId!
            },            
        },
        relations: ['project']
    });

    if (!task) {
        res.status(403).json({
            message: "FORBIDDEN ACCESS OR TASK NOT FOUND"
        })
        return;
    }

    await taskRepo.update(
        taskId,
        {
            status: newStatus
        }
    );

    res.status(200).json({
        task
    })
});

// Schedule print for task with ID: [params.id]
router.post("/:id/schedule-print", async (req, res): Promise<any> => {
    const taskId = Number(req.params.id);
    const user = (req as any).user;
    const organizationId = user.organizationId;

    const {
        printerId,
        estimatedDuration,
        materialId,
        productionStartTime,
        progressStage,
        runs,
        productionQuantity,
        barcode
    } = req.body;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    if (!productionQuantity || productionQuantity <= 0) {
        return res.status(400).json({ message: 'Production Quantity must be greater than 0' });
    }

    if (!materialId) {
        return res.status(400).json({ message: 'Material ID is required' });
    }

    // Start database transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // Fetch the task with its project
        const task = await queryRunner.manager.findOne(Task, {
            where: { id: taskId },
            relations: ['project', 'project.organization']
        });

        if (!task) {
            await queryRunner.rollbackTransaction();
            return res.status(404).json({ message: 'Task not found' });
        }

        // Verify organization access
        if (task.project.organization.id !== organizationId) {
            await queryRunner.rollbackTransaction();
            return res.status(403).json({ message: 'Access denied' });
        }

        const projectId = task.project.id;

        // Get the department of the User / Create progress log
        const requestFromDepartment = progressStage;

        console.log("status passed in:", requestFromDepartment);

        const progressRequest = {
            params: { id: projectId },
            user: (req as any).user,
            body: {
                id: uuidv4(),
                status: requestFromDepartment,
                projectId: projectId
            }
        };
        
        console.log("progress request before calling create progressLog:", progressRequest);
        const createProgressResponse = await projectController.createProgressLog(progressRequest);
        console.log("createProgressResponse:", createProgressResponse);

        let progressLog = createProgressResponse.progressLog;
        if (Math.floor(createProgressResponse.statusCode / 100) !== 2) {
            await queryRunner.rollbackTransaction();
            return res.status(createProgressResponse.statusCode).json({ message: "Error Occurred." });
        } else if (createProgressResponse.statusCode === 209) {
            progressLog = (await progressLogRepo
                .createQueryBuilder("log")
                .innerJoin("log.project", "project")
                .where("project.id = :projectId", { projectId })
                .andWhere("log.status = :status", { status: requestFromDepartment })
                .orderBy("log.startDate", "DESC")
                .addOrderBy("log.createdAt", "DESC")
                .limit(1)
                .getOne()) ?? undefined;

            if (!progressLog) {
                await queryRunner.rollbackTransaction();
                return res.status(createProgressResponse.statusCode).json({ 
                    message: "Unexpected Error Occurred. Please try again." 
                });
            }
        }

        progressLog = progressLog!;

        // Fetch material
        const material = await queryRunner.manager.findOne(Material, {
            where: { id: materialId }
        });

        if (!material) {
            await queryRunner.rollbackTransaction();
            return res.status(400).json({
                message: "Material not found"
            });
        }

        // Update material stock demand
        const updatedStockDemand = Number(material.stockDemand || 0) + Number(productionQuantity);
        material.stockDemand = updatedStockDemand;

        // Determine task status based on stock availability
        let taskStatus = task.status;
        
        // Check if this production would exceed available stock
        if (updatedStockDemand > Number(material.currentStock)) {
            taskStatus = 'blocked';
        }

        // Save material with updated demand
        await queryRunner.manager.save(material);

        // Create uncommitted stock transaction record
        const transaction = queryRunner.manager.create(StockTransaction, {
            materialId: materialId,
            type: TransactionType.STOCK_OUT,
            quantity: productionQuantity,
            balanceAfter: material.currentStock, // Balance doesn't change yet since not committed
            projectId: projectId,
            notes: "",
            createdById: user.id,
            barcode: barcode,
            committed: false, // Key: not committed yet
            task: task,
            taskId: task.id
        });

        await queryRunner.manager.save(transaction);

        // Update task with production details
        task.status = taskStatus;
        task.printerId = printerId;
        task.productionDuration = estimatedDuration;
        task.materialId = materialId;
        task.productionStartTime = productionStartTime;
        task.runs = runs;
        task.productionQuantity = productionQuantity;
        task.stockTransaction = transaction;
        task.progressLogs = [...(task.progressLogs || []), progressLog];

        const savedTask = await queryRunner.manager.save(task);

        // Re-evaluate all other non-completed/non-blocked tasks for this material
        await checkAndBlockTasksForMaterial(materialId, queryRunner);

        await queryRunner.commitTransaction();

        res.status(200).json({
            message: `Print scheduled successfully for task ${taskId}`,
            taskId: savedTask.id,
            status: taskStatus,
            wasBlocked: taskStatus === 'blocked'
        });

    } catch (err) {
        await queryRunner.rollbackTransaction();
        console.error(err);
        res.status(400).json({
            message: `Failed to schedule print for task ${taskId}`,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    } finally {
        await queryRunner.release();
    }
});


/**
 * Helper function to check and block tasks based on material stock availability
 * Should be placed in a shared location or service
 */
async function checkAndBlockTasksForMaterial(
    materialId: string,
    queryRunner: any
): Promise<void> {
    const { Not, In } = require('typeorm');
    
    // Get the material with current stock
    const material = await queryRunner.manager.findOne(Material, {
        where: { id: materialId },
    });

    if (!material) {
        throw new Error('Material not found');
    }

    // Get all relevant tasks, ordered by priority (higher number = higher priority = first)
    // Only tasks that are NOT completed and NOT already blocked
    const tasks = await queryRunner.manager.find(Task, {
        where: {
            materialId: materialId,
            // status: Not(In(['completed', 'blocked'])),
            status: In(['pending', 'blocked'])
        },
        order: {
            priority: 'DESC', // Higher priority first (4, 3, 2, 1)
            createdAt: 'ASC',  // If same priority, older tasks first
        },
    });

    if (tasks.length === 0) {
        return;
    }

    // Calculate cumulative demand and block tasks as needed
    let cumulativeDemand = 0;

    for (const task of tasks) {
        const taskQuantity = Number(task.productionQuantity || 0);
        
        // Add this task's demand to cumulative
        cumulativeDemand += taskQuantity;

        // Check if task production quantity exceeds available stock
        if (taskQuantity > Number(material.currentStock)) {
            // Block this task due to insufficient stock
            if (task.status !== 'blocked') {
                task.status = 'blocked';
                await queryRunner.manager.save(task);
            }
        } else {
            // If task was previously blocked due to stock and now has sufficient stock, unblock it
            if (task.status === 'blocked') {
                task.status = 'pending'; // or whatever default active status you use
                await queryRunner.manager.save(task);
            }
        }
    }

    // Update material's total stock demand with all non-completed tasks
    material.stockDemand = cumulativeDemand;
    await queryRunner.manager.save(material);
}

export default router;