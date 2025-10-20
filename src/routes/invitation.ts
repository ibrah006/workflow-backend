import { Router, Request, Response } from 'express';
import { InvitationService } from '../services/invitation_service';
import { Invitation, InvitationStatus } from '../models/Invitation';
import { authMiddleware } from '../middleware/authMiddleware';
import { AppDataSource } from '../data-source';
import { Organization } from '../models/Organization';
import { User } from '../models/User';

const router = Router();
const invitationService = new InvitationService();

// Middleware to authenticate user (implement your own)
const authenticate = (req: Request, res: Response, next: any) => {
  // Your authentication logic
  // req.user = { id: 'user-id', ... }
  next();
};

// DTO interfaces for validation
interface SendInvitationDto {
  email: string;
  organizationId: string;
  role?: string;
}

interface CancelInvitationDto {
  invitationId: string;
}

/**
 * POST /api/invitations
 * Send an invitation to join an organization
 */
router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, role } = req.body;
      const organizationId = (req as any).user.organizationId;

      // Validation
      if (!email || !organizationId) {
        res.status(400).json({
          success: false,
          message: 'Email and organizationId are required',
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      // Check if the user is already part of this organization
      const user = await AppDataSource.getRepository(User).findOne({
        where: {
          email: email
        },
        relations: ['organization']
      });

      if (user && user.organization && (user.organization.id === organizationId)) {
        res.status(409).json({
          message: "The user is already part of this organization",
        });
        return;
      }

      // Check if there's already a pending invitation
      const existingInvitation = await AppDataSource.getRepository(Invitation).findOne({
        where: {
          email,
          organizationId,
          status: InvitationStatus.PENDING,
        },
        relations: ['invitedBy', 'organization']
      });

      if (existingInvitation) {
        res.status(208).json({
          message: "An active invitation already exists for this email",
          data: existingInvitation,
          organization: {
            id: existingInvitation.organization.id,
            name: existingInvitation.organization.name
          }
        });
        return;
      }

      const userId = (req as any).user.id; // From auth middleware

      const invitation = await invitationService.sendInvitation(
        email.toLowerCase(),
        organizationId,
        userId,
        role
      );

      res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          role: invitation.role,
          invitedBy: { id: userId },
          token: invitation.token,
          organization: {
            id: organizationId,
            name: invitation.organization.name
          },
          createdAt: invitation.createdAt
        },
      });
    } catch (error: any) {
      console.error('Send invitation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send invitation',
      });
    }
  }
);

/**
 * DELETE /api/invitations/:invitationId
 * Cancel a pending invitation
 */
router.delete(
  '/:invitationId',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { invitationId } = req.params;
      const userId = (req as any).user.id;

      if (!invitationId) {
        res.status(400).json({
          success: false,
          message: 'Invitation ID is required',
        });
        return;
      }

      const invitation = await invitationService.cancelInvitation(
        invitationId,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Invitation cancelled successfully',
        data: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
        },
      });
    } catch (error: any) {
      console.error('Cancel invitation error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel invitation',
      });
    }
  }
);

/**
 * GET /api/invitations/organization/:organizationId
 * Get all invitations for an organization
 */
router.get(
  '/organization',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).user.organizationId;
      const { status } = req.query;

      const invitations = await invitationService.getOrganizationInvitations(
        organizationId,
        status as InvitationStatus
      );

      res.status(200).json({
        success: true,
        data: invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          role: inv.role,
          expiresAt: inv.expiresAt,
          organization: inv.organization,
          token: inv.token,
          invitedBy: inv.invitedBy
            ? {
                id: inv.invitedBy.id,
                // Add other safe user fields
              }
            : null,
          createdAt: inv.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('Get invitations error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch invitations',
      });
    }
  }
);

/**
 * POST /api/invitations/accept/:token
 * Accept an invitation (public endpoint)
 */
router.post(
  '/accept/:invitationToken',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.params.invitationToken;

      await invitationService.acceptInvitation(token);

      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to accept invitation',
      });
    }
  }
);

/**
 * GET /api/invitations/verify/:token
 * Verify an invitation token (public endpoint)
 */
router.get(
  '/verify/:token',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {

    const userId = (req as any).user.id;

    try {
      const { token } = req.params;

      const invitation = await invitationService.getInvitationByToken(token);

      if (!invitation) {
        res.status(404).json({
          success: false,
          message: 'Invalid or expired invitation',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          email: invitation.email,
          organizationName: invitation.organization.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error: any) {
      console.error('Verify invitation error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to verify invitation',
      });
    }
  }
);

/**
 * GET /api/invitations/me
 * Get all pending invitations for the current user
 */
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const userEmail = user.email; // Assuming email is available in user object

      if (!userEmail) {
        res.status(400).json({
          success: false,
          message: 'User email not found',
        });
        return;
      }

      const invitations = await invitationService.getUserPendingInvitations(
        userEmail.toLowerCase()
      );

      res.status(200).json({
        success: true,
        data: invitations.map((inv) => ({
          id: inv.id,
          organization: inv.organization,
          role: inv.role,
          token: inv.token,
          expiresAt: inv.expiresAt,
          email: userEmail,
          invitedBy: inv.invitedBy
            ? {
                id: inv.invitedBy.id,
                // Add other safe user fields like name, email if needed
              }
            : null,
          createdAt: inv.createdAt,
        })),
        count: invitations.length,
      });
    } catch (error: any) {
      console.error('Get user invitations error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch user invitations',
      });
    }
  }
)

export default router;