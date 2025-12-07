import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Project } from "../models/Project";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { In, IsNull, Not } from "typeorm";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { ProgressLog } from "../models/ProgressLog";
import projectController from "../controller/project";
import { notifyProjectAboutLastTaskChange } from "./tasks";
import { Company } from "../models/Company";
import { Organization } from "../models/Organization";


const router = Router();

const projectRepo = AppDataSource.getRepository(Project);
const taskRepo = AppDataSource.getRepository(Task);
const userRepo = AppDataSource.getRepository(User);
const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);
const progressLogRepo = AppDataSource.getRepository(ProgressLog);
const companyRepo = AppDataSource.getRepository(Company);
const organizationRepo = AppDataSource.getRepository(Organization);

export const PROJECT_GET_RELATIONS = [
    "progressLogs", 
    "tasks", 
    "assignedManagers", 
    "tasks.assignees", 
    "tasks.progressLog", 
    "client", 
    "client.createdBy", 
    "materialLogs"
];

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
                "tasks",
                "materialLogs"
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
    const projectId = req.params.id;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    // Verify project belongs to user's organization
    const project = await projectRepo.findOne({
        where: { id: projectId, organizationId },
        select: ['id']
    });

    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }

    // Required body from user: { id, project, status, description?, isError? (db default: false) }
    let body;
    try {
        body = { 
            ...req.body, 
            project: { id: projectId }, 
            updatedAt: undefined 
        } as Partial<ProgressLog>;
    } catch(err) {
        return res.status(400).json({ message: "Invalid body params, check the ProjectLog schema" });
    }
    delete body.updatedAt;

    if (project.status == body.status) {
        return res.status(209).json({ message: "Can't update project to the existing status" });
    }

    let savedLog;
    try {
        const log = progressLogRepo.create(body);
        savedLog = await progressLogRepo.save(log);

        // Update project status
        project.status = log.status;
        await projectRepo.save(project);
    } catch(err) {
        console.error(err);
        return res.status(500).json({ message: "Unexpected error from server side" });
    }

    await updateProgressLogLastModifiedAt(savedLog.id);

    res.status(201).json({ 
        message: "Successfully created progress log",
        id: savedLog.id
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
router.post("/:id/tasks", async (req, res) : Promise<any>=> {
    const projectId = req.params.id;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    const {
        name,
        description,
        dueDate,
        status,
        assignees: assigneeIds,
        dateCompleted,
        progressLog
    } = req.body;
  
    try {
        // Fetch related project (scoped to organization)
        const project = await projectRepo.findOne({
            relations: PROJECT_GET_RELATIONS, 
            where: { id: projectId, organizationId }
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        
        // Fetch User entities from the assigneeIds (if provided)
        // Ensure users belong to the same organization
        let assignees : User[] = [];
        if (assigneeIds && Array.isArray(assigneeIds)) {
            assignees = await userRepo.find({
                where: { 
                    id: In(assigneeIds),
                    organization: { id: organizationId }
                }
            });

            if (assignees.length !== assigneeIds.length) {
                return res.status(400).json({ 
                    message: "One or more assignees do not belong to your organization" 
                });
            }
        }

        // Create new task with resolved relations
        const newTask = taskRepo.create({
            name,
            description,
            dueDate,
            status,
            dateCompleted,
            project,
            assignees,
            progressLog
        });
    
        const savedTask = await taskRepo.save(newTask);
        
        res.status(201).json({
            message: `Task created successfully for project ${projectId}`,
            taskId: savedTask.id,
        });

    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to create task for project ${projectId}`,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});

// Edit Task endpoint
function entityField(key: string, value: any | null): {} {
    return value !== undefined ? {[key]: value} : {};
}

router.put("/tasks/:taskId", adminOnlyMiddleware, async (req, res) : Promise<any>=> {
    const taskId = parseInt(req.params.taskId);
    const updatedTaskData = req.body;
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

// --------------------------------------------------
// GET Projects overall status
// GET /projects/active
// --------------------------------------------------
// { activeProjects, activeProjectsLength, pendingProjectsLength, finishedLength }
router.get("/projects-overall-status", async (req, res) => {
    const organizationId = (req as any).user?.organizationId;

    console.log("overall status called");
  
    try {
      const projectRepo = AppDataSource.getRepository(Project);
  
      const activeProjects = await projectRepo.find({
        where: {
          organizationId,
          status: Not(In(['cancelled', 'finished'])),
        },
        order: {
          createdAt: 'DESC',
        },
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

      console.log("overall status call success");
  
      res.json({
        activeProjects,
        activeLength: activeProjects.length,
        pendingLength,
        finishedLength
      });
    } catch (err) {
    //   console.log("overall status call failed");
    //   console.error("get project overall status error: ", err);
      res.status(500).json({ error: 'Failed to fetch active projects' });
    }
  });



export default router;