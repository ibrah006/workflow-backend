import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import { Task } from "../models/Task";
import usersController from '../controller/users';
import { Organization } from "../models/Organization";
import { getEmailDomain, isPrivateDomainEmail } from "../utils/email";


const router = Router();

const userRepo = AppDataSource.getRepository(User);
const taskRepo = AppDataSource.getRepository(Task);
const organizationRepo = AppDataSource.getRepository(Organization);

router.get("/", async (req, res)=> {
    const users = await userRepo.find();

    res.json(users);
});

/// GET assignees for a specific task
/// If the client's timestamp is newer or equal, return empty array because no new assignees since client's last sync
/// Otherwise, return all assignees for this task
router.get("/task/:taskId", usersController.getTaskAssignees);

// Password-less login using existing JWT
router.post("/me/re-login", usersController.relogin)

router.get('/me', async (req: Request, res: Response) => {

    try {
        const user = await userRepo.findOne({
            where: { id: (req as any).user!.id },
            relations: ["department", "organization"]
        });
    
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        let autoInviteOrganization = null;

        // Check to see if user is part of any organization
        const organizationId = (req as any).user.organizationId;
        if (!organizationId) {
            // if user is not part of any organization
            // Check to see if the user's email domain is private
            if (isPrivateDomainEmail(user.email)) {
                // Get user's private domain
                const userEmailDomain = getEmailDomain(user.email)!;
                // Check to see if there is any existing organization with this user's private domain
                const existingOrganizationWithSamePrivateDomain = await organizationRepo.findOne({
                    where: {
                        privateDomain: userEmailDomain
                    },
                    relations: ['createdBy', 'users', 'projects', 'companies']
                });
                
                if (existingOrganizationWithSamePrivateDomain) {
                    autoInviteOrganization = {
                        ...existingOrganizationWithSamePrivateDomain,
                        createdBy: { id: existingOrganizationWithSamePrivateDomain.createdBy.id },
                        // Omit password field
                        users: existingOrganizationWithSamePrivateDomain.users.map((user) => {
                            return {
                                ...user,
                                password: undefined
                            }
                        })
                    }
                }
            }
        }
    
        // omit sensitive fields like password
        const { password, ...safeUser } = user;
        res.json({
            user: safeUser,
            autoInviteOrganization: autoInviteOrganization
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