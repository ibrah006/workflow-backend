import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Project } from "../models/Project";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { In, IsNull, MoreThanOrEqual, Not } from "typeorm";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { ProgressLog } from "../models/ProgressLog";
import projectController, { PROJECT_GET_RELATIONS } from "../controller/project";
import { notifyProjectAboutLastTaskChange } from "./tasks";
import { Company } from "../models/Company";
import { Organization } from "../models/Organization";
import { Material } from "../models/Material";
import { MaterialService, StockOutCommitTransactionDto, StockOutDto } from "../services/materialService";
import { StockTransaction, TransactionType } from "../models/StockTransaction";


const router = Router();

const projectRepo = AppDataSource.getRepository(Project);
const taskRepo = AppDataSource.getRepository(Task);
const userRepo = AppDataSource.getRepository(User);
const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const progressLogRepo = AppDataSource.getRepository(ProgressLog);
const companyRepo = AppDataSource.getRepository(Company);
const organizationRepo = AppDataSource.getRepository(Organization);
const materialRepo = AppDataSource.getRepository(Material);
const transactionRepo = AppDataSource.getRepository(StockTransaction);

const materialService = new MaterialService();

/**
 * Update the progressLogLastModifiedAt column of project model
 * @param progressLogId
 */
export async function updateProgressLogLastModifiedAt(progressLogId: string) : Promise<void> {
    const subQuery = AppDataSource
        .createQueryBuilder()
        .subQuery()
        .select('pl.projectId')
        .from(ProgressLog, 'pl')
        .where('pl.id = :progressLogId')
        .getQuery(); // returns raw SQL

    await AppDataSource
        .createQueryBuilder()
        .update(Project)
        .set({ progressLogLastModifiedAt: new Date() })
        .where(`id = ${subQuery}`)
        .setParameter('progressLogId', progressLogId)
        .execute();
}

router.get("/get-recent", projectController.getMostRecentlyActiveProjects);

// Create a project
router.post("/", async (req, res) : Promise<any>=> {
    const data = req.body as Partial<Project>;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    const organization = (await organizationRepo.findOne({
        where: { id: organizationId }
    }))!;

    try {
        // Verify client company belongs to the same organization (if provided)
        if (data.client && (data.client as any).id) {
            const clientId = (data.client as any).id;
            const client = await companyRepo.findOne({
                where: { id: clientId, organizationId }
            });

            if (!client) {
                return res.status(400).json({
                    message: 'Client company not found or does not belong to your organization'
                });
            }
        }

        // Verify assigned managers belong to the same organization (if provided)
        if (data.assignedManagers && Array.isArray(data.assignedManagers)) {
            const managerIds = data.assignedManagers.map((m: any) => m.id || m);
            const managers = await userRepo.find({
                where: { 
                    id: In(managerIds),
                    organization: { id: organizationId }
                }
            });

            if (managers.length !== managerIds.length) {
                return res.status(400).json({
                    message: 'One or more assigned managers do not belong to your organization'
                });
            }
        }

        // Set organizationId for the project
        const projectData = {
            ...data,
            organizationId
        };

        const project = projectRepo.create(projectData);
        const savedProject = await projectRepo.save(project);        

        // update projects last added
        organization.projectsLastAdded = new Date;
        await organizationRepo.save(organization)

        res.status(201).json({
            message: 'Successfully created project',
            id: savedProject.id
        })
    } catch(err) {
        console.error("error:", err);
        res.status(400).json({
            message: `Failed to create project`,
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});

// Get project finish rate
router.get('/:id/progress-rate', projectController.getProjectProgressRate);

// Get avg progress rate of all projects in the organization
router.get('/progress-rate', projectController.getOrganizationProgressRate);

// Get Projects listing (scoped to organization)
router.get("/", async (req, res) : Promise<any>=> {
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const projects = await projectRepo.find({
            where: { organizationId },
            relations: [
                ...PROJECT_GET_RELATIONS,
            ],
        });
  
        res.json(projects);
    } catch (error) {
        console.error("Error fetching projects with material logs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get progress logs by project
router.get("/:id/progressLogs", projectController.getProgressLogsByProject);

router.get("/:id/progressLogs/last-modified", projectController.getProgressLogLastModified);

// Create Progress log
router.post("/:id/progressLogs", async (req, res) : Promise<any> => {
    const createProgressResponse = await projectController.createProgressLog(req);

    let message;
    switch (createProgressResponse.statusCode) {
        case 400: message = "Invalid body params, check the ProjectLog schema"; break;
        case 404: message = "Project not found"; break;
        case 209: message = "Can't update project to the existing status"; break;
        case 201: message = "Successfully created progress log"; break;
        case 500: message = "Unexpected error from server side"; break;
    }

    res.status(createProgressResponse.statusCode).json({ 
        message: message,
        // progress log is only returned when status === 201
        id: createProgressResponse.progressLog?.id
    });
})

// Update project status
router.put("/:id", async (req, res) : Promise<any> => {
    const id = req.params.id;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    let newStatus;
    try {
        newStatus = req.body.status;

        if (!newStatus) {
            return res.status(400).json({ message: `Invalid status provided` });
        }
    } catch(e) {
        return res.status(400).json({ message: `Failed to update status of project ${id}` });
    }

    // Verify project belongs to user's organization
    const project = await projectRepo.findOne({
        where: { id, organizationId }
    });

    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }

    await projectRepo.update(id, {
        status: newStatus.toString()
    });

    res.status(200).json({ message: `Successfully updated status` });
})

/// Manage Project tasks

/// Manage Project tasks

// Add task for project with ID: [params.id]
router.post("/:id/tasks", async (req, res): Promise<any> => {
    const projectId = req.params.id;
    const user = (req as any).user;
    const organizationId = user.organizationId;

    const {
        name,
        description,
        dueDate,
        status,
        assignees: assigneeIds,
        dateCompleted,
        priority
    } = req.body;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    // Start database transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // Fetch the project
        const project = await queryRunner.manager.findOne(Project, {
            where: { 
                id: projectId,
                organization: { id: organizationId }
            }
        });

        if (!project) {
            await queryRunner.rollbackTransaction();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Fetch User entities from the assigneeIds
        let assignees: User[] = [];
        if (assigneeIds && Array.isArray(assigneeIds)) {
            assignees = await queryRunner.manager.find(User, {
                where: {
                    id: In(assigneeIds),
                    organization: { id: organizationId }
                }
            });

            if (assignees.length !== assigneeIds.length) {
                await queryRunner.rollbackTransaction();
                return res.status(400).json({
                    message: "One or more assignees do not belong to your organization"
                });
            }
        }

        // Create new task with basic information
        const newTask = queryRunner.manager.create(Task, {
            name,
            description,
            dueDate,
            status: status || 'pending',
            dateCompleted,
            project,
            assignees,
            priority: priority || 1
        });

        const savedTask = await queryRunner.manager.save(newTask);

        await queryRunner.commitTransaction();

        res.status(201).json({
            message: `Task created successfully for project ${projectId}`,
            taskId: savedTask.id
        });

    } catch (err) {
        await queryRunner.rollbackTransaction();
        console.error(err);
        res.status(400).json({
            message: `Failed to create task for project ${projectId}`,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    } finally {
        await queryRunner.release();
    }
});

// Edit Task endpoint
function entityField(key: string, value: any | null): {} {
    return value !== undefined ? {[key]: value} : {};
}

// Update task endpoint
router.put("/tasks/:taskId", adminOnlyMiddleware, async (req, res) : Promise<any>=> {
    const taskId = parseInt(req.params.taskId);
    const updatedTaskData = req.body;
    const organizationId = (req as any).user?.organizationId;
    const userId = (req as any).user.id;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['assignees', 'project', 'stockTransaction'],
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Verify task's project belongs to user's organization
        const project = await projectRepo.findOne({
            where: { id: task.project.id, organizationId },
            select: ['id']
        });

        if (!project) {
            return res.status(403).json({ 
                message: "You don't have permission to modify this task" 
            });
        }

        // Update non-relation fields
        const updates = {
            ...entityField("name", updatedTaskData.name),
            ...entityField("description", updatedTaskData.description),
            ...entityField("dueDate", updatedTaskData.dueDate),
            ...entityField("status", updatedTaskData.status),
            ...entityField("dateCompleted", updatedTaskData.dateCompleted),
        };

        await taskRepo.update(taskId, updates);

        // If task is marked completed
        if (task.status !== updatedTaskData.status && updatedTaskData.status === 'completed') {
            // Stock out, update the material's currentStock and stockDemand
            // await materialRepo.update(task.materialId, {
            //     currentStock: task.material.currentStock - task.productionQuantity,
            //     stockDemand: task.material.stockDemand - task.productionQuantity
            // })

            await materialService.stockOut({
                quantity: task.stockTransaction.quantity,
                projectId: task.project.id,
                taskId: task.id,
                transactionId: task.stockTransactionId
            } as StockOutCommitTransactionDto);
        }

        // If assignees are passed, update relation
        if (updatedTaskData.assignees) {
            const users = await userRepo.find({
                where: {
                    id: In(updatedTaskData.assignees as string[]),
                    organization: { id: organizationId }
                }
            });

            if (users.length !== updatedTaskData.assignees.length) {
                return res.status(400).json({ 
                    message: "One or more assignees do not belong to your organization" 
                });
            }

            task.assignees = users;
            task.assigneesLastAdded = new Date();
            await taskRepo.save(task);
        }

        res.json({ message: `Task ${taskId} updated successfully` });

    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to update task ${taskId}`,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});

// Delete task endpoint
router.delete("/tasks/:taskId", adminOnlyMiddleware, async (req, res) : Promise<any>=> {
    const taskId = parseInt(req.params.taskId);
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }
    
    try {
        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['project']
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Verify task's project belongs to user's organization
        const project = await projectRepo.findOne({
            where: { id: task.project.id, organizationId },
            select: ['id']
        });

        if (!project) {
            return res.status(403).json({ 
                message: "You don't have permission to delete this task" 
            });
        }

        // Check out all active users from the task before deleting
        await workActivityLogRepo.update(
            {
                task: { id: taskId },
                end: IsNull(),
            },
            {
                end: new Date(),
            }
        );

        await taskRepo.delete(taskId);

        res.json({
            message: `Successfully deleted task ${taskId}`
        });
    } catch(err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to delete task ${taskId}`,
            error: err instanceof Error ? err.message : 'Unknown error'
        })
    } 
});

// --------------------------------------------------
// GET Projects overall status
// GET /projects/overall-status
// --------------------------------------------------
// { activeProjects, activeProjectsLength, pendingProjectsLength, finishedLength, totalLength }
router.get("/overall-status", async (req, res) => {
    const organizationId = (req as any).user?.organizationId;

    console.log("overall status called");
  
    try {

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0); // to ensure date-only comparison
  
        const activeProjects = await projectRepo.find({
            where: {
                organizationId,
                status: Not(In(['cancelled', 'finished'])),
                // estimatedProductionStart: MoreThanOrEqual(todayDate),
            },
            order: {
                createdAt: 'DESC',
            },
            relations: PROJECT_GET_RELATIONS,
        });
          
        const pendingLength = await projectRepo.count({
            where: {
                organizationId,
                status: "pending",
            }
        });

        const finishedLength = await projectRepo.count({
            where: {
                organizationId,
                status: "finished",
            }
        });

        // --------------------------------------------------
        // Month-over-month increase
        // --------------------------------------------------
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentYear = today.getFullYear();

        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Count for current month
        const countThisMonth = await projectRepo
            .createQueryBuilder("p")
            .where("p.organizationId = :orgId", { orgId: organizationId })
            .andWhere("EXTRACT(MONTH FROM p.createdAt) = :currentMonth", {
                currentMonth,
            })
            .andWhere("EXTRACT(YEAR FROM p.createdAt) = :currentYear", { currentYear })
            .getCount();

        // Count for previous month
        const countLastMonth = await projectRepo
            .createQueryBuilder("p")
            .where("p.organizationId = :orgId", { orgId: organizationId })
            .andWhere("EXTRACT(MONTH FROM p.createdAt) = :lastMonth", { lastMonth })
            .andWhere("EXTRACT(YEAR FROM p.createdAt) = :lastMonthYear", {
                lastMonthYear,
            })
            .getCount();

        const increaseWRTPrevMonth = countThisMonth - countLastMonth;

        console.log("overall status call success");

        // --------------------------------------------------
        // Response
        // --------------------------------------------------
        res.json({
            activeProjects,
            activeLength: activeProjects.length,
            pendingLength,
            finishedLength,

            // NEW FIELD:
            countThisMonth,
            countLastMonth,
            increaseWRTPrevMonth,
        });
    } catch (err) {
    //   console.log("overall status call failed");
    //   console.error("get project overall status error: ", err);
      res.status(500).json({ error: 'Failed to fetch active projects' });
    }
  });


// Assign task to users
router.put("/tasks/:taskId/assign", adminOnlyMiddleware, async (req, res) : Promise<any>=> {
    const taskId = parseInt(req.params.taskId);
    const userIds: string[] = req.body.users;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['assignees', 'project'],
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Verify task's project belongs to user's organization
        const project = await projectRepo.findOne({
            where: { id: task.project.id, organizationId },
            select: ['id']
        });

        if (!project) {
            return res.status(403).json({ 
                message: "You don't have permission to assign this task" 
            });
        }

        // Ensure users belong to the same organization
        const users = await userRepo.find({
            where: { 
                id: In(userIds),
                organization: { id: organizationId }
            }
        });

        if (users.length !== userIds.length) {
            return res.status(400).json({ 
                message: "One or more users do not belong to your organization" 
            });
        }

        task.assignees = [
            ...task.assignees,
            ...users
        ];
        task.assigneesLastAdded = new Date();

        const savedTask = await taskRepo.save(task);

        await notifyProjectAboutLastTaskChange(task.project.id, savedTask.updatedAt);

        res.json({
            message: `Successfully assigned task ${taskId} to ${users.length} user(s)`,
        });

    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to assign task ${taskId} to user(s)`,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});

// Get Project by Id (scoped to organization)
router.get("/:id", async (req, res) : Promise<any>=> {
    const id = req.params.id;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const project = await projectRepo.findOne({
            relations: [
                "tasks",
                "tasks.assignees",
                "tasks.wastageLog",
                "tasks.discussionThreads",
                "tasks.workActivityLogs",
                "materialLogs",
                "assignedManagers"
            ],
            where: { id, organizationId }
        });

        if (!project) {
            return res.status(404).json({
                message: `Project with ${id} not found`
            });
        }

        res.json(project);
    } catch(err) {
        console.error(err);
        res.status(500).json({
            message: `Error fetching project ${id}`,
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});


export default router;