import { Router } from "express";
import { AppDataSource } from "../data-source";
import { MaterialLog } from "../models/MaterialLog";

import materialLogController from "../controller/materialLog";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router()

const materialLogRepo = AppDataSource.getRepository(MaterialLog);

// get all logs
router.get("/", async (req, res)=> {
    const logs = await materialLogRepo.find();
    res.json(logs);
});

// get log by id
router.get("/:id", async (req, res)=> {
    const logId = parseInt(req.params.id);
    const log = await materialLogRepo.findOneBy({ id: logId });
    res.json(log);
});

// add material log
router.post("/", async (req, res)=> {

    const userId = (req as any).user.id;

    const {
        description,
        quantity,
        task,
        width,
        height
    } = req.body;
    
    try {
        const log = materialLogRepo.create({
            description: description,
            quantity: quantity,
            width: width,
            height: height,
            materialsUsedTask: task,
            loggedBy: { id: userId }
        });
        await materialLogRepo.save(log);
    } catch(e) {
        res.status(400).send("Invalid request, please check the request body");
    }
});

router.get("/project/:projectId", materialLogController.getMaterialLogsByProject)

export default router;