import { Router } from "express";
import progressLogController from "../controller/progressLog";


const router = Router();

router.get('/:id', progressLogController.getLogById);
// Update Progress Log
router.put('/:logId', progressLogController.updateProgressLog);

export default router;