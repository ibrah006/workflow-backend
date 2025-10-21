import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Organization } from "../models/Organization";
import { User } from "../models/User";
import { adminOnlyMiddleware } from "../middleware/adminOnlyMiddleware";
import users from "../controller/users";

const router = Router();

const organizationRepo = AppDataSource.getRepository(Organization);
const userRepo = AppDataSource.getRepository(User);

/**
 * POST /organizations
 * Create a new organization
 * The authenticated user becomes the creator and first member
 */
router.post("/", async (req, res) : Promise<any> => {
    const { name, description } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Organization name is required' });
    }

    try {
        // Check if user already belongs to an organization
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['organization']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.organization) {
            return res.status(400).json({ 
                message: 'You already belong to an organization. Leave your current organization first.' 
            });
        }

        // Check if organization name already exists
        const existingOrg = await organizationRepo.findOne({
            where: { name: name.trim() }
        });

        if (existingOrg) {
            return res.status(409).json({ 
                message: 'An organization with this name already exists' 
            });
        }

        // Create the organization
        const organization = organizationRepo.create({
            name: name.trim(),
            description: description?.trim() || null,
            createdBy: user,
            createdById: userId
        });

        const savedOrg = await organizationRepo.save(organization);

        // Update user to belong to this organization
        user.organization = savedOrg;
        user.role = 'admin'; // Creator becomes admin
        await userRepo.save(user);

        return res.status(201).json({
            message: 'Organization created successfully',
            organization: {
                ...savedOrg,
                // TODO: make sure users are returned safe without their passwords
            }
        });

    } catch (error) {
        console.error('Error creating organization:', error);
        return res.status(500).json({ 
            message: 'Failed to create organization',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /organizations/join
 * Join an existing organization
 * Requires organization ID or invitation code
 */
router.post("/join", async (req, res) : Promise<any> => {
    const { organizationId, organizationName } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!organizationId && !organizationName) {
        return res.status(400).json({ 
            message: 'Either organizationId or organizationName is required' 
        });
    }

    try {
        // Get the user
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['organization']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.organization) {
            return res.status(400).json({ 
                message: 'You already belong to an organization. Leave your current organization first.' 
            });
        }

        // Find the organization
        let organization;
        if (organizationId) {
            organization = await organizationRepo.findOne({
                where: { id: organizationId }
            });
        } else if (organizationName) {
            organization = await organizationRepo.findOne({
                where: { name: organizationName.trim() }
            });
        }

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Add user to organization
        user.organization = organization;
        user.role = 'viewer'; // Default role for new members
        await userRepo.save(user);

        return res.status(200).json({
            message: 'Successfully joined organization',
            organization: {
                id: organization.id,
                name: organization.name,
                description: organization.description
            }
        });

    } catch (error) {
        console.error('Error joining organization:', error);
        return res.status(500).json({ 
            message: 'Failed to join organization',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /organizations/leave
 * Leave current organization
 */
router.post("/leave", async (req, res) : Promise<any> => {
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['organization']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.organization) {
            return res.status(400).json({ 
                message: 'You are not part of any organization' 
            });
        }

        const organizationId = user.organization.id;

        // Check if user is the creator of the organization
        const organization = await organizationRepo.findOne({
            where: { id: organizationId },
            relations: ['createdBy']
        });

        if (organization?.createdBy.id === userId) {
            return res.status(403).json({ 
                message: 'Organization creators cannot leave. Please transfer ownership or delete the organization.' 
            });
        }

        // Remove user from organization
        user.organization = null as any;
        user.role = 'viewer'; // Reset to default role
        await userRepo.save(user);

        return res.status(200).json({
            message: 'Successfully left organization'
        });

    } catch (error) {
        console.error('Error leaving organization:', error);
        return res.status(500).json({ 
            message: 'Failed to leave organization',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /organizations/current
 * Get current user's organization details
 */
router.get("/current", async (req, res) : Promise<any> => {
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['organization', 'organization.createdBy', 'organization.users', 'organization.projects']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.organization) {
            return res.status(404).json({ 
                message: 'You are not part of any organization' 
            });
        }

        // Get member count
        const memberCount = await userRepo.count({
            where: { organization: { id: user.organization.id } }
        });

        return res.status(200).json({
            id: user.organization.id,
            name: user.organization.name,
            description: user.organization.description,
            createdAt: user.organization.createdAt,
            users: user.organization.users,
            projects: user.organization.projects,
            companies: user.organization.companies,
            createdBy: {
                id: user.organization.createdBy.id,
                name: user.organization.createdBy.name,
                email: user.organization.createdBy.email,
                role: user.organization.createdBy.role
            },
            updatedAt: user.organization.updatedAt,
            memberCount,
            userRole: user.role
        });

    } catch (error) {
        console.error('Error fetching organization:', error);
        return res.status(500).json({ 
            message: 'Failed to fetch organization details',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /organizations/members
 * Get all members of current user's organization
 */
router.get("/members", async (req, res) : Promise<any> => {
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const members = await userRepo.find({
            where: { organization: { id: organizationId } },
            select: ['id', 'name', 'email', 'role', 'createdAt'],
            order: { createdAt: 'ASC' }
        });

        return res.status(200).json({
            members,
            total: members.length
        });

    } catch (error) {
        console.error('Error fetching members:', error);
        return res.status(500).json({ 
            message: 'Failed to fetch organization members',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /organizations/members/:userId/role
 * Update a member's role (admin only)
 */
router.put("/members/:userId/role", adminOnlyMiddleware, async (req, res) : Promise<any> => {
    const { userId } = req.params;
    const { role } = req.body;
    const organizationId = (req as any).user?.organizationId;
    const requestingUserId = (req as any).user?.id;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    if (!role || !['admin', 'manager', 'viewer'].includes(role)) {
        return res.status(400).json({ 
            message: 'Invalid role. Must be one of: admin, manager, viewer' 
        });
    }

    try {
        // Get the target user
        const targetUser = await userRepo.findOne({
            where: { 
                id: userId,
                organization: { id: organizationId }
            },
            relations: ['organization']
        });

        if (!targetUser) {
            return res.status(404).json({ 
                message: 'User not found in your organization' 
            });
        }

        // Prevent users from demoting themselves
        if (userId === requestingUserId) {
            return res.status(403).json({ 
                message: 'You cannot change your own role' 
            });
        }

        // Check if target user is the organization creator
        const organization = await organizationRepo.findOne({
            where: { id: organizationId },
            relations: ['createdBy']
        });

        if (organization?.createdBy.id === userId) {
            return res.status(403).json({ 
                message: 'Cannot change the role of the organization creator' 
            });
        }

        // Update the role
        targetUser.role = role;
        await userRepo.save(targetUser);

        return res.status(200).json({
            message: `Successfully updated ${targetUser.name}'s role to ${role}`,
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role
            }
        });

    } catch (error) {
        console.error('Error updating member role:', error);
        return res.status(500).json({ 
            message: 'Failed to update member role',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /organizations/members/:userId
 * Remove a member from organization (admin only)
 */
router.delete("/members/:userId", adminOnlyMiddleware, async (req, res) : Promise<any> => {
    const { userId } = req.params;
    const organizationId = (req as any).user?.organizationId;
    const requestingUserId = (req as any).user?.id;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        // Get the target user
        const targetUser = await userRepo.findOne({
            where: { 
                id: userId,
                organization: { id: organizationId }
            },
            relations: ['organization']
        });

        if (!targetUser) {
            return res.status(404).json({ 
                message: 'User not found in your organization' 
            });
        }

        // Prevent users from removing themselves
        if (userId === requestingUserId) {
            return res.status(403).json({ 
                message: 'You cannot remove yourself. Use the leave endpoint instead.' 
            });
        }

        // Check if target user is the organization creator
        const organization = await organizationRepo.findOne({
            where: { id: organizationId },
            relations: ['createdBy']
        });

        if (organization?.createdBy.id === userId) {
            return res.status(403).json({ 
                message: 'Cannot remove the organization creator' 
            });
        }

        // Remove user from organization
        targetUser.organization = null as any;
        targetUser.role = 'viewer'; // Reset to default role
        await userRepo.save(targetUser);

        return res.status(200).json({
            message: `Successfully removed ${targetUser.name} from the organization`
        });

    } catch (error) {
        console.error('Error removing member:', error);
        return res.status(500).json({ 
            message: 'Failed to remove member',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /organizations
 * Update organization details (admin only)
 */
router.put("/", adminOnlyMiddleware, async (req, res) : Promise<any> => {
    const { name, description } = req.body;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const organization = await organizationRepo.findOne({
            where: { id: organizationId }
        });

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Check if new name already exists (if name is being changed)
        if (name && name.trim() !== organization.name) {
            const existingOrg = await organizationRepo.findOne({
                where: { name: name.trim() }
            });

            if (existingOrg) {
                return res.status(409).json({ 
                    message: 'An organization with this name already exists' 
                });
            }
            organization.name = name.trim();
        }

        if (description !== undefined) {
            organization.description = description?.trim() || null;
        }

        const updatedOrg = await organizationRepo.save(organization);

        return res.status(200).json({
            message: 'Organization updated successfully',
            organization: {
                id: updatedOrg.id,
                name: updatedOrg.name,
                description: updatedOrg.description,
                updatedAt: updatedOrg.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating organization:', error);
        return res.status(500).json({ 
            message: 'Failed to update organization',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /organizations
 * Delete organization (creator only)
 */
router.delete("/", async (req, res) : Promise<any> => {
    const organizationId = (req as any).user?.organizationId;
    const userId = (req as any).user?.id;

    if (!organizationId) {
        return res.status(401).json({ message: 'Organization context required' });
    }

    try {
        const organization = await organizationRepo.findOne({
            where: { id: organizationId },
            relations: ['createdBy']
        });

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Only creator can delete
        if (organization.createdBy.id !== userId) {
            return res.status(403).json({ 
                message: 'Only the organization creator can delete the organization' 
            });
        }

        // Check for existing projects (optional - you may want to prevent deletion if projects exist)
        const projectCount = await AppDataSource
            .getRepository('Project')
            .count({ where: { organizationId } });

        if (projectCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete organization with ${projectCount} existing project(s). Please delete all projects first.` 
            });
        }

        // Delete the organization (cascade will handle related data)
        await organizationRepo.remove(organization);

        return res.status(200).json({
            message: 'Organization deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting organization:', error);
        return res.status(500).json({ 
            message: 'Failed to delete organization',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /organizations/search
 * Search for organizations by name (for joining)
 */
router.get("/search", async (req, res) : Promise<any> => {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ 
            message: 'Search query must be at least 2 characters' 
        });
    }

    try {
        const organizations = await organizationRepo
            .createQueryBuilder('organization')
            .select(['organization.id', 'organization.name', 'organization.description'])
            .where('LOWER(organization.name) LIKE LOWER(:query)', { 
                query: `%${query.trim()}%` 
            })
            .limit(10)
            .getMany();

        return res.status(200).json({
            organizations,
            total: organizations.length
        });

    } catch (error) {
        console.error('Error searching organizations:', error);
        return res.status(500).json({ 
            message: 'Failed to search organizations',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get("/projects-last-added", async (req, res) => {
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        res.status(401).json({ message: 'Organization context required' });
        return;
    }

    const organization = await organizationRepo.findOne({
        where: { id: organizationId }
    });
    
    const projectsLastAdded = organization?.projectsLastAdded;

    res.json({
        projectsLastAdded: projectsLastAdded
    })
}) 

export default router;