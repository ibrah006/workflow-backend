// src/routes/materialRoutes.ts
import { Router, Request, Response } from 'express';
import { CreateMaterialDto, MaterialService } from '../services/materialService';
import { MeasureType } from '../models/Material';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const materialService = new MaterialService();

// Create a new material or multiple materials
router.post('/materials', async (req: Request, res: Response) : Promise<any> =>  {
  try {
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;

    // Check if request body is an array (bulk create) or single object
    const isBulk = Array.isArray(req.body);
    const materialsData = isBulk ? req.body : [req.body];

    // Validate all materials
    for (const material of materialsData) {
      const { name, measureType } = material;
      
      if (!name || !measureType) {
        return res.status(400).json({
          error: 'Name and measure type are required for all materials',
        });
      }

      if (!Object.values(MeasureType).includes(measureType)) {
        return res.status(400).json({
          error: `Invalid measure type: ${measureType}`,
          validTypes: Object.values(MeasureType),
        });
      }
    }

    // Prepare materials with user and org data
    const preparedMaterials = materialsData.map((material: CreateMaterialDto) => ({
      name: material.name,
      description: material.description,
      measureType: material.measureType,
      minStockLevel: material.minStockLevel,
      initialStock: material.initialStock,
      organizationId,
      createdById: userId,
    }));

    let result;
    if (isBulk) {
      // Bulk create
      result = await materialService.createMaterials(preparedMaterials, organizationId);
    } else {
      // Single create
      result = await materialService.createMaterial(preparedMaterials[0], organizationId);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating material(s):', error);
    res.status(500).json({ error: error });
  }
});

// Get all materials for organization
router.get('/materials',  async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const materials = await materialService.getMaterialsByOrganization(organizationId);
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: error });
    
  }
});

// Get material by ID
router.get('/materials/:id',  async (req: Request, res: Response) => {
  try {
    const material = await materialService.getMaterial(req.params.id);
    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(404).json({ error: error });
  }
});

// Update material
router.put('/materials/:id',  async (req: Request, res: Response) => {
  try {
    const { name, description, measureType, minStockLevel } = req.body;
    
    const material = await materialService.updateMaterial(req.params.id, {
      name,
      description,
      measureType,
      minStockLevel,
    });

    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: error });
  }
});

// Delete material
router.delete('/materials/:id',  async (req: Request, res: Response) => {
  try {
    await materialService.deleteMaterial(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: error });
  }
});

// Stock In - Add stock to material
router.post('/materials/:id/stock-in',  async (req: Request, res: Response) => {
  try {
    const { quantity, notes } = req.body;
    const userId = (req as any).user.id;
    const organizationId = (req as any).user.organizationId;

    if (!quantity || quantity <= 0) {
      res.status(400).json({
        error: 'Quantity must be greater than 0',
      });
      return;
    }

    const transaction = await materialService.stockIn({
      materialId: req.params.id,
      quantity: parseFloat(quantity),
      notes,
      userId,
      organizationId
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error processing stock in:', error);
    res.status(500).json({ error: error });
  }
});

// Stock Out - Remove stock from material
router.post('/materials/:barcode/stock-out',  async (req: Request, res: Response) => {
  try {
    const { quantity, projectId, notes } = req.body;
    const userId = (req as any).user.id;

    if (!quantity || quantity <= 0) {
      res.status(400).json({
        error: 'Quantity must be greater than 0',
      });
      return;
    }

    const stockTransaction = await materialService.stockOut({
      barcode: req.params.barcode,
      quantity: parseFloat(quantity),
      projectId,
      notes,
      userId,
    });

    res.status(201).json(stockTransaction);
  } catch (error) {
    console.error('Error processing stock out:', error);
    res.status(500).json({ error: error });
  }
});

// Get material transaction history
router.get('/materials/:id/transactions',  async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const transactions = await materialService.getMaterialTransactions(
      req.params.id,
      limit
    );
    console.log("transactions by material:", transactions);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error });
  }
});

// Get transaction by barcode
router.get('/transactions/barcode/:barcode',  async (req: Request, res: Response) => {
  try {
    const transaction = await materialService.getTransactionByBarcode(req.params.barcode);
    
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction by barcode:', error);
    res.status(500).json({ error: error });
  }
});

// Get transaction for current organization
router.get('/transactions',  async (req: Request, res: Response) => {
  try {
    const transaction = await materialService.getTransactions((req as any).organizationId);
    
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction by barcode:', error);
    res.status(500).json({ error: error });
  }
});

// Get low stock materials
router.get('/materials/alerts/low-stock',  async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const materials = await materialService.getLowStockMaterials(organizationId);
    res.json(materials);
  } catch (error) {
    console.error('Error fetching low stock materials:', error);
    res.status(500).json({ error: error });
  }
});

// Get material usage for a project
router.get('/projects/:projectId/materials',  async (req: Request, res: Response) => {
  try {
    const transactions = await materialService.getProjectMaterialUsage(req.params.projectId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching project material usage:', error);
    res.status(500).json({ error: error });
  }
});

export default router;