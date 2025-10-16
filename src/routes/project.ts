import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Project } from "../models/Project";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { In, IsNull } from "typeorm";
import { WorkActivityLog } from "../models/WorkActivityLog";
import { ProgressLog } from "../models/ProgressLog";
import projectController from "../controller/project";
import { notifyProjectAboutLastTaskChange } from "./tasks";


const router = Router();

const projectRepo = AppDataSource.getRepository(Project);
const taskRepo = AppDataSource.getRepository(Task);
const userRepo = AppDataSource.getRepository(User);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);

const progressLogRepo = AppDataSource.getRepository(ProgressLog);

export const PROJECT_GET_RELATIONS = ["progressLogs", "tasks", "assignedManagers", "tasks.assignees", "tasks.progressLog", "tasks.materialsUsed", "tasks.materialsEstimated", "client", "client.createdBy"];

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
router.post("/", async (req, res) => {
    const data = req.body as Partial<Project>;

    try {
        const project = projectRepo.create(data);
        
        const savedProject = await projectRepo.save(project);

        res.status(201).json({
            message: 'Successfully created project',
            id: savedProject.id
        })
    } catch(err) {
        console.error("error:", err);
        res.status(400).json({
            message: `Failed to create project ${JSON.stringify(data)}`,
            // error: err
        });
    }
});

// Get project finish rate
router.get('/:id/progress-rate', projectController.getProjectProgressRate);
// Get avg progress rate of all projects
router.get('/progress-rate', projectController.getProjectsProgressRate);

// Get Projects listing
router.get("/", async (req, res) => {
    try {
      const projects = await projectRepo.find({
        relations: [
          ...PROJECT_GET_RELATIONS, // your existing relations
          "tasks",                         // ensure tasks are loaded
          "tasks.materialsEstimated",      // estimated material logs
          "tasks.materialsUsed",           // used material logs
          "tasks.materialsEstimated.loggedBy", // optional: who logged
          "tasks.materialsUsed.loggedBy"       // optional: who logged
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

    // Required body from user: { id, project, status, description?, isError? (db default: false) }
    let body;
    try {
        body = { ...req.body, project: { id: projectId }, updatedAt: undefined } as Partial<ProgressLog>;
    } catch(err) {
        return res.status(400).send("Invalid body params, check the ProjectLog schema");
    }
    delete body.updatedAt;
    

    let savedLog;
    try {
        const log = progressLogRepo.create(body);
        
        savedLog = await progressLogRepo.save(log);
    } catch(err) {
        return res.status(500).send("Unexpected error from server side");
    }

    await updateProgressLogLastModifiedAt(savedLog.id);

    res.status(201).send("Successfully created progress log");
})


// required query parameter: status
router.put("/:id", async (req, res) : Promise<any> => {
    const id = req.params.id;

    let newStatus;
    try {
        newStatus = req.body.status;

        if (!newStatus) {
            return res.status(400).send(`Invalid status provided`);
        }
    } catch(e) {
        return res.status(400).send(`Failed to update status of project ${id}`);
    }
    await projectRepo.update(id, {
        status: newStatus.toString()
    });

    res.status(200).send(`Successfully updated status`);
})

/// Manage Project tasks

// Add task for project with ID: [params.id]
// adminOnlyMiddleware
router.post("/:id",  async (req, res) => {
    const projectId = req.params.id;
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
        // Fetch related project
        const project = await projectRepo.findOne({
            relations: PROJECT_GET_RELATIONS, where: { id: projectId }
        });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }
        
        // Fetch User entities from the assigneeIds (if provided)
        let assignees : User[] = [];
        if (assigneeIds && Array.isArray(assigneeIds)) {
            assignees = await userRepo.findBy({ id: In(assigneeIds) });
        }

        // Create new task with resolved relations
        const newTask = taskRepo.create({
            name,
            description,
            dueDate,
            status,
            dateCompleted,
            project, // Set resolved project
            assignees, // Set resolved user entities
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
            error: err,
        });
    }
});

// Edit Task endpoint
function entityField(key: string, value: any | null): {} {
    return value !== undefined? {[key]: value} : {};
}
router.put("/tasks/:taskId", adminOnlyMiddleware, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const updatedTaskData = req.body;

    try {
        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['assignees'], // required for updating relations
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        // Update non-relation fields
        const updates = {
            ...entityField("name", updatedTaskData.name),
            ...entityField("description", updatedTaskData.description),
            ...entityField("dueDate", updatedTaskData.dueDate),
            ...entityField("status", updatedTaskData.status),
            ...entityField("materialsUsed", updatedTaskData.materialsUsed),
            ...entityField("dateCompleted", updatedTaskData.dateCompleted),
        };

        await taskRepo.update(taskId, updates);

        // If assignees are passed, update relation
        if (updatedTaskData.assignees) {
            const users = await userRepo.findBy({id: In(updatedTaskData.assignees as string[])});
            task.assignees = users;
            task.assigneesLastAdded = new Date();
            await taskRepo.save(task); // Update relation
        }

        res.json({ message: `Task ${taskId} updated successfully` });

    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to update task ${taskId}`,
            error: err,
        });
    }
});

// Delete task endpoint
router.delete("/tasks/:taskId", adminOnlyMiddleware, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    try {

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
        res.status(400).json({
            message: `Failed to delete task ${taskId}`,
            error: err
        })
    } 
});


// Assign task to users
router.put("/tasks/:taskId/assign", adminOnlyMiddleware, async (req, res) => {

    const taskRepo = AppDataSource.getRepository(Task);

    const taskId = parseInt(req.params.taskId);
    const userIds: string[] = req.body.users;

    try {

        const task = await taskRepo.findOne({
            where: { id: taskId },
            relations: ['assignees'],
        });

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        const users = await userRepo.findBy({ id: In(userIds) });

        task.assignees = [
            ...task.assignees,
            ...users
        ];
        task.assigneesLastAdded = new Date();

        const savedTask = await taskRepo.save(task); // Triggers relation updates

        await notifyProjectAboutLastTaskChange(task.project.id, savedTask.updatedAt);

        res.json({
            message: `Successfully assigned task ${taskId} to ${users.length} user(s)`,
        });

    } catch (err) {
        console.error(err);
        res.status(400).json({
            message: `Failed to assign task ${taskId} to user(s)`,
            error: err,
        });
    }
});

// Get Project by Id
router.get("/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const project = await projectRepo.findOneOrFail({
            relations: [
                "tasks",
                "tasks.assignees",
                "tasks.wastageLog",
                "tasks.discussionThreads",
                "tasks.workActivityLogs",
                "tasks.materialsUsed",
                "tasks.materialsEstimated",
                "assignedManagers"
            ],
            where: { id: id }
        });

        res.json(project);
    } catch(err) {
        res.status(404).json({
            message: `Project with ${id} not found`,
            error: err
        });
    }
});

export default router;