import { Router } from "express";
import { AppDataSource } from "../data-source";
import { loginUser } from "../services/authService";

const router = Router();

router.post('/login', async (req, res)=> {
    const { email, password } = req.body;

    try {
        const { token, user } = await loginUser(email, password);
        res.json({ token, user });
    } catch(err) {
        res.status(401).json({ error: err })
    }
});

export default router;