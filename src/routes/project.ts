import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Project } from "../models/Project";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { In, IsNull } from "typeorm";
import { WorkActivityLog } from "../models/WorkActivityLog";


const router = Router();

const projectRepo = AppDataSource.getRepository(Project);
const taskRepo = AppDataSource.getRepository(Task);
const userRepo = AppDataSource.getRepository(User);

const workActivityLogRepo = AppDataSource.getRepository(WorkActivityLog);

// Create a project
router.post("/", adminOnlyMiddleware, async (req, res) => {
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

// Get Projects listing
router.get("/", async (req, res) => {
    const projects = await projectRepo.find(
        { relations: ["tasks", "assignedManagers"] }
    );
    res.json(projects);
});

/// Manage Project tasks

// Add task for project with ID: [params.id]
router.post("/:id", adminOnlyMiddleware, async (req, res) => {
    const projectId = parseInt(req.params.id);
    const {
        name,
        description,
        dueDate,
        status,
        assignees: assigneeIds,
        materialsUsed,
        dateCompleted,
      } = req.body;
  
    try {
        // Fetch related project
        const project = await projectRepo.findOneBy({ id: projectId });
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
            materialsUsed,
            dateCompleted,
            project, // Set resolved project
            assignees, // Set resolved user entities
        });
    
        const savedTask = await taskRepo.save(newTask);
        
        res.status(201).json({
            message: `Task created successfully for project ${projectId}`,
            task: savedTask,
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

        await taskRepo.save(task); // Triggers relation updates

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
    const id = parseInt(req.params.id);

    try {
        const project = await projectRepo.findOneOrFail({
            relations: [
                "tasks",
                "tasks.assignees",
                "tasks.wastageLog",
                "tasks.discussionThreads",
                "tasks.workActivityLogs",
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