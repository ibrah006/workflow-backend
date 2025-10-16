import { Router } from "express";
import { AppDataSource } from "../data-source";
import { MaterialLog } from "../models/MaterialLog";

import materialLogController from "../controller/materialLog";

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
    const body = req.body;
    
    try {
        const log = materialLogRepo.create(body);
        await materialLogRepo.save(log);
    } catch(e) {
        res.status(400).send("Invalid request, please check the request body");
    }
});

router.get("/project/:projectId", materialLogController.getMaterialLogsByProject)

export default router;