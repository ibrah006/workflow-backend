import { Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

const userRepo = AppDataSource.getRepository(User);

router.put("/role/:id", authMiddleware, async (req, res) => {
    const userId = req.params.id;
    const role = req.body.role;

    await userRepo.update(userId, { role: role });
});

export default router;