import { Router } from "express";
import { AppDataSource } from "../data-source";
import { MaterialLog } from "../models/MaterialLog";

import materialLogController from "../controller/materialLog";
import { authMiddleware } from "../middleware/authMiddleware";
import { MaterialLogType } from "../enums/MaterialLogType";

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
        project,
        width,
        height
    } = req.body;
    
    try {
        const log = materialLogRepo.create({
            description: description,
            quantity: quantity,
            width: width,
            height: height,
            project: project,
            loggedBy: { id: userId },
            type: MaterialLogType.MATERIAL_OUT
        });
        const savedLog = await materialLogRepo.save(log);
        
        res.status(201).json(savedLog)
    } catch(e) {
        res.status(400).json({
            message: "Invalid request, please check the request body",
            error: e
        });
    }
});

router.get("/project/:projectId", materialLogController.getMaterialLogsByProject)

export default router;