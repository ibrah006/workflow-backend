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
        const user = await userRepo.findOne({
            where: { id: (req as any).user!.id },
            relations: ["department"]
        });
    
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
    
        // omit sensitive fields like password
        const { password, ...safeUser } = user;
        res.json({
            user: safeUser,
        });
    } catch (err) {
        console.error('Failed to fetch user profile:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
  });
  

router.put("/:id/role", adminOnlyMiddleware, async (req, res) : Promise<any> => {
    const userId = req.params.id;
    const role = req.body.role;

    try {
        await userRepo.update(userId, { role: role });
    } catch(err) {
        return res.status(404).json({
            message: `User ${userId} not found!`
        })
    }

    return res.json({
        message: `Successfully updated user role!`
    });
});

export default router;