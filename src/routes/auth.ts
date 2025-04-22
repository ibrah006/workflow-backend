import { Router } from "express";
import { loginUser, registerUser } from "../services/authService";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/authMiddleware";


const router = Router();

router.post('/register', async (req, res)=> {
    const { email, password } = req.body;

    try {
        const user = await registerUser(email, password);
        res.json({ message: 'User registered', user });
    } catch(err) {
        res.status(400).json({ error: err });
    }
});

router.post('/login', async (req, res)=> {
    const { email, password } = req.body;

    try {
        const { token, user } = await loginUser(email, password);
        res.json({ token, user });
    } catch(err) {
        res.status(401).json({ error: err })
    }
});


router.get("/", authMiddleware, async (req, res)=> {
    const userRepo = AppDataSource.getRepository(User);

    const users = await userRepo.find();

    res.json(users);
});

export default router;