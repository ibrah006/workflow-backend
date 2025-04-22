import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import { registerUser } from "../services/authService";


const router = Router();

const userRepo = AppDataSource.getRepository(User);

router.get("/", async (req, res)=> {
    const users = await userRepo.find();

    res.json(users);
});


router.get('/me', async (req: Request, res: Response) => {
    try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOneBy({ id: (req as any).user!.id });
    
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
    
        // Optionally, omit sensitive fields like password
        const { password, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        console.error('Failed to fetch user profile:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
  });
  

router.put("/:id/role", adminOnlyMiddleware, async (req, res) => {
    const userId = req.params.id;
    const role = req.body.role;

    await userRepo.update(userId, { role: role });
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