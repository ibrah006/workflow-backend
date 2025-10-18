import { Router } from "express";
import { loginUser, registerUser } from "../services/authService";

const router = Router();

router.post('/login', async (req, res)=> {
    const { email, password } = req.body;

    try {
        const { token, user } = await loginUser(String(email), String(password));
        res.json({ token, user });
    } catch(err) {
        console.error(err);
        res.status(401).json({ error: err })
    }
});

router.post('/register', async (req, res)=> {
    const { email, password, name, role } = req.body;

    try {
        const user = await registerUser(email, password, name, role);
        res.json({ message: 'User registered', user });
    } catch(err) {
        res.status(400).json({ error: err });
    }
});

export default router;