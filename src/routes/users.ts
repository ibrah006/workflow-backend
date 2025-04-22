import { Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminOnlyMiddleware } from "../middleware/authOnlyMiddleware";
import { registerUser } from "../services/authService";


const router = Router();

const userRepo = AppDataSource.getRepository(User);

router.put("/:id/role", adminOnlyMiddleware, async (req, res) => {
    const userId = req.params.id;
    const role = req.body.role;

    await userRepo.update(userId, { role: role });
});

router.get("/me", async (req, res)=> {
    const users = await userRepo.find();

    res.json(users);
});

router.post('/register', adminOnlyMiddleware, async (req, res)=> {
    const { email, password } = req.body;

    try {
        const user = await registerUser(email, password);
        res.json({ message: 'User registered', user });
    } catch(err) {
        res.status(400).json({ error: err });
    }
});

export default router;