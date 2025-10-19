import { Router, Request, Response } from 'express';
import { SampleOrganizationService } from '../services/sampleOrganization';

const router = Router();
const sampleOrgService = new SampleOrganizationService();

// Middleware to authenticate user (implement your own)
const authenticate = (req: Request, res: Response, next: any) => {
  // Your authentication logic
  // req.user = { id: 'user-id', ... }
  next();
};

/**
 * POST /api/sample-organization
 * Creates a sample organization for the user to explore
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;

      const sampleOrg = await sampleOrgService.createSampleOrganization(
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Sample organization created successfully',
        data: {
          id: sampleOrg.id,
          name: sampleOrg.name,
          description: sampleOrg.description,
          isSample: sampleOrg.isSample,
          createdAt: sampleOrg.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Create sample organization error:', error);
      const statusCode = error.message.includes('already has') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create sample organization',
      });
    }
  }
);

/**
 * GET /api/sample-organization
 * Gets the user's sample organization if it exists
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;

      const sampleOrg = await sampleOrgService.getUserSampleOrganization(
        userId
      );

      if (!sampleOrg) {
        res.status(404).json({
          success: false,
          message: 'No sample organization found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: sampleOrg.id,
          name: sampleOrg.name,
          description: sampleOrg.description,
          isSample: sampleOrg.isSample,
          createdAt: sampleOrg.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Get sample organization error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to retrieve sample organization',
      });
    }
  }
);

/**
 * DELETE /api/sample-organization/:organizationId
 * Deletes the user's sample organization
 */
router.delete(
  '/:organizationId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
        return;
      }

      await sampleOrgService.deleteSampleOrganization(userId, organizationId);

      res.status(200).json({
        success: true,
        message: 'Sample organization deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete sample organization error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete sample organization',
      });
    }
  }
);

/**
 * PATCH /api/sample-organization/:organizationId/convert
 * Converts a sample organization to a real one
 */
router.patch(
  '/:organizationId/convert',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { organizationId } = req.params;
      const { name } = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
        return;
      }

      const organization = await sampleOrgService.convertSampleToReal(
        userId,
        organizationId,
        name
      );

      res.status(200).json({
        success: true,
        message: 'Sample organization converted to real organization',
        data: {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          isSample: organization.isSample,
          updatedAt: organization.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('Convert sample organization error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to convert sample organization',
      });
    }
  }
);

export default router;