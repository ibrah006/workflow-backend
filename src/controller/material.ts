// Example: How to use in a controller with proper error handling
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { MaterialService } from '../services/materialService';

export class MaterialController {
  constructor(private materialService: MaterialService) {}

  async createMaterial(req: Request, res: Response, next: NextFunction) {

    const organizationId = (req as any).user.organizationId;

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const material = await this.materialService.createMaterial({
        ...req.body,
        createdById: (req as any).user.id,
      }, organizationId);

      res.status(201).json({
        success: true,
        data: material,
        message: 'Material created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async stockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const transaction = await this.materialService.stockIn({
        materialId: req.params.id,
        quantity: parseFloat(req.body.quantity),
        notes: req.body.notes,
        userId: (req as any).user.id,
        organizationId: (req as any).user.organizationId
      });

      if (!transaction) {
        res.status(400).json({
            message: "Failed to create Stock in entry"
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: transaction,
        message: `Stock added successfully. Barcode: ${transaction.barcode}`,
      });
    } catch (error) {
      next(error);
    }
  }
}