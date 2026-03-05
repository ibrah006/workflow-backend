// Example: How to use in a controller with proper error handling
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { MaterialService } from '../services/materialService';
import { QueryRunner } from 'typeorm';
import { StockTransaction, TransactionType } from '../models/StockTransaction';
import { Material } from '../models/Material';
import { Task } from '../models/Task';
import { User } from '../models/User';

// ── Inputs ────────────────────────────────────────────────────────────────────
export interface StockOutInput {
  /** Quantity to consume — must be > 0 */
  productionQuantity:  number;
  projectId:           string;
  barcode:             string;
  notes?:              string;
  task:                Task;
  user:                User;
}

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

  // ── Main function ─────────────────────────────────────────────────────────────
  /**
   * Records a stock-out event against a specific StockIn batch.
   *
   * Must be called with an already-started QueryRunner transaction.
   * The caller is responsible for commit / rollback / release.
   *
   * @example
   * ```ts
   * const qr = dataSource.createQueryRunner();
   * await qr.connect();
   * await qr.startTransaction();
   * try {
   *   const { stockOut } = await recordStockOut(qr, input);
   *   await qr.commitTransaction();
   * } catch (e) {
   *   await qr.rollbackTransaction();
   *   throw e;
   * } finally {
   *   await qr.release();
   * }
   * ```
   */
  async recordStockOut(
    queryRunner: QueryRunner,
    input: StockOutInput,
  ): Promise<{ stockOut: StockTransaction; updatedBatch: StockTransaction }> {

    const {
      productionQuantity,
      projectId,
      barcode,
      notes,
      task,
      user,
    } = input;

    // ── 1. Lock the StockIn batch row ─────────────────────────────────────────
    // PESSIMISTIC_WRITE = SELECT … FOR UPDATE
    // Blocks any other transaction from locking (or even reading with FOR UPDATE)
    // this same row until we commit or roll back.
    const sourceBatch = await queryRunner.manager.findOne(StockTransaction, {
      where: { barcode: barcode, type: TransactionType.STOCK_IN },
      lock:  { mode: 'pessimistic_write' },
    });

    if (!sourceBatch) {
      throw new BatchNotFoundError(barcode);
    }

    // ── 2. Guard: does the batch have enough stock? ───────────────────────────
    // We read the current quantity from the locked row — no phantom read possible.
    const available = Number(sourceBatch.quantity);
    if (productionQuantity > available) {
      throw new InsufficientStockError(productionQuantity, available);
    }

    // ── 3. Decrement StockIn.quantity atomically ──────────────────────────────
    // Using SQL arithmetic instead of a JS-computed value eliminates any
    // residual race if a caller somehow bypasses the lock above.
    await queryRunner.manager
      .createQueryBuilder()
      .update(StockTransaction)
      .set({ quantity: () => `quantity - ${productionQuantity}` })
      .where('id = :id', { barcode: barcode })
      .execute();

    // ── 4. Decrement Material.currentStock atomically ─────────────────────────
    // Lock the Material row as well so concurrent stock-outs from *different*
    // batches of the same material don't race on currentStock.
    await queryRunner.manager.findOne(Material, {
      where: { id: sourceBatch.materialId },
      lock:  { mode: 'pessimistic_write' },
    });

    await queryRunner.manager
      .createQueryBuilder()
      .update(Material)
      .set({ currentStock: () => `current_stock - ${productionQuantity}` })
      .where('id = :id', { id: sourceBatch.materialId })
      .execute();

    // Re-read balanceAfter from the now-updated material row so the value
    // stored on the StockOut record is accurate.
    const updatedMaterial = await queryRunner.manager.findOneOrFail(Material, {
      where: { id: sourceBatch.materialId },
    });

    // ── 5. Insert the StockOut transaction record ─────────────────────────────
    const stockOut = queryRunner.manager.create(StockTransaction, {
      materialId:          sourceBatch.materialId,
      type:                TransactionType.STOCK_OUT,
      quantity:            productionQuantity,
      // Accurate balance from the row we just updated — not a stale JS value.
      balanceAfter:        Number(updatedMaterial.currentStock),
      projectId,
      notes:               notes ?? '',
      createdById:         user.id,
      barcode,
      committed:           true,
      task,
      taskId:              task.id
    });

    await queryRunner.manager.save(StockTransaction, stockOut);

    // Re-read the updated batch so the caller gets fresh data (not stale JS copy)
    const updatedBatch = await queryRunner.manager.findOneOrFail(StockTransaction, {
      where: { barcode: barcode, type: TransactionType.STOCK_IN },
    });

    return {
      stockOut,
      updatedBatch
    };
  }

}

// ── Custom errors (callers can catch these specifically) ──────────────────────
export class BatchNotFoundError extends Error {
  constructor(barcode: string) {
    super(`StockIn batch with barcode '${barcode}' not found`);
    this.name = 'BatchNotFoundError';
  }
}

export class InsufficientStockError extends Error {
  /** How much was requested vs how much was available */
  constructor(
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `Insufficient stock: requested ${requested}, available ${available}`,
    );
    this.name = 'InsufficientStockError';
  }
}