// src/services/MaterialService.ts
import { In, Not, Repository } from 'typeorm';
import crypto from 'crypto';
import { Material, MeasureType } from '../models/Material';
import { StockTransaction, TransactionType } from '../models/StockTransaction';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { AppDataSource } from '../data-source';
import { Task } from '../models/Task';

export interface CreateMaterialDto {
  name: string;
  description?: string;
  measureType: MeasureType;
  minStockLevel?: number;
  initialStock?: number;
  createdById: string;
}

interface StockInDto {
  materialId: string;
  quantity: number;
  notes?: string;
  userId: string;
  organizationId: string
}

export interface StockOutDto {
  barcode: string;
  quantity: number;
  projectId?: string;
  taskId?: number;
  notes?: string;
  userId: string;
}

export interface StockOutCommitTransactionDto {
  quantity: number;
  projectId?: string;
  taskId?: number;
  userId: string;
  /**
   * The existing stock out transaction that has not yet been committed
  */
  transactionId: string;
}

function isStockOutCommitTransactionDto(
  data: StockOutDto | StockOutCommitTransactionDto
): data is StockOutCommitTransactionDto {
  return 'transactionId' in data;
}


export class MaterialService {
  private materialRepo: Repository<Material>;
  private transactionRepo: Repository<StockTransaction>;
  private organizationRepo: Repository<Organization>;
  private userRepo: Repository<User>;
  private projectRepo: Repository<Project>;
  private taskRepo: Repository<Task>;

  constructor() {
    this.materialRepo = AppDataSource.getRepository(Material);
    this.transactionRepo = AppDataSource.getRepository(StockTransaction);
    this.organizationRepo = AppDataSource.getRepository(Organization);
    this.userRepo = AppDataSource.getRepository(User);
    this.projectRepo = AppDataSource.getRepository(Project);
    this.taskRepo = AppDataSource.getRepository(Task);
  }

  async createMaterial(data: CreateMaterialDto, organizationId: string): Promise<Material> {
    // Verify organization exists
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Verify user exists
    const user = await this.userRepo.findOne({
      where: { id: data.createdById },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const existingMaterial = await this.materialRepo.find({
      where: {name: data.name}
    });
    if (!existingMaterial) {
      return existingMaterial;
    }

    // Create material
    const material = this.materialRepo.create({
      name: data.name,
      description: data.description,
      measureType: data.measureType,
      minStockLevel: data.minStockLevel || 0,
      currentStock: data.initialStock || 0,
      organizationId: organizationId,
      createdById: data.createdById,
    });

    await this.materialRepo.save(material);

    // If initial stock provided, create initial stock-in transaction
    if (data.initialStock && data.initialStock > 0) {
      await this.stockIn({
        materialId: material.id,
        quantity: data.initialStock,
        notes: 'Initial stock',
        userId: data.createdById,
        organizationId: organization.id
      });
    }

    const savedMaterial = (await this.materialRepo.findOne({where: {id: material.id}}))!;

    console.log("saved material:", savedMaterial);

    return savedMaterial;
  }

  // Return with material barcode
  async createMaterials(
    materialsData: CreateMaterialDto[],
    organizationId: string
  ): Promise<Material[]> {
    if (!materialsData || materialsData.length === 0) {
      throw new Error('No materials data provided');
    }

    // Verify organization exists
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Verify user exists
    const userId = materialsData[0].createdById;
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new Error('User not found');
    }

    // Create all materials
    const materials = materialsData.map((data) =>
      this.materialRepo.create({
        name: data.name,
        description: data.description,
        measureType: data.measureType,
        minStockLevel: data.minStockLevel || 0,
        currentStock: data.initialStock || 0,
        organizationId: organizationId,
        createdById: data.createdById,
      })
    );

    // Bulk insert materials
    const savedMaterials = await this.materialRepo
      .createQueryBuilder()
      .insert()
      .into(Material)
      .values(materials)
      .onConflict(`("organizationId", "name") DO NOTHING`)
      .returning("*")
      .execute();

    const inserted = savedMaterials.raw.map(
      (row: Partial<Material>) => this.materialRepo.create(row)
    );

    // Prepare stock-in transactions for materials with initial stock
    const stockTransactions: StockTransaction[] = [];
    for (const [index, material] of inserted.entries()) {
      const initialStock = materialsData[index].initialStock;
      if (initialStock && initialStock > 0) {
        const transaction = await this.stockIn({
          materialId: material.id,
          quantity: initialStock,
          userId: userId,
          organizationId: organizationId
        }, false);
        stockTransactions.push(transaction!);
      }
    }

    // Bulk insert stock transactions if any
    if (stockTransactions.length > 0) {
      await this.transactionRepo.save(stockTransactions);
    }

    return inserted;
  }

  // Return with material barcode
  async getMaterial(id: string): Promise<Material> {
    const material = await this.materialRepo.findOne({
      where: { id },
      relations: ['organization', 'createdBy'],
    });

    if (!material) {
      throw new Error('Material not found');
    }

    return material;
  }

  // Return with materials barcode
  async getMaterialsByOrganization(organizationId: string): Promise<Material[]> {
    return this.materialRepo.find({
      where: { organizationId },
      relations: ['createdBy'],
      order: { name: 'ASC' },
    });
  }

  async updateMaterial(
    id: string,
    data: Partial<CreateMaterialDto>
  ): Promise<Material> {
    const material = await this.getMaterial(id);

    if (data.name) material.name = data.name;
    if (data.description !== undefined) material.description = data.description;
    if (data.measureType) material.measureType = data.measureType;
    if (data.minStockLevel !== undefined) material.minStockLevel = data.minStockLevel;

    await this.materialRepo.save(material);
    return material;
  }

  async deleteMaterial(id: string): Promise<void> {
    const material = await this.getMaterial(id);
    
    // Check if there are any transactions
    const transactionCount = await this.transactionRepo.count({
      where: { materialId: id },
    });

    if (transactionCount > 0) {
      throw new Error('Cannot delete material with existing transactions');
    }

    await this.materialRepo.remove(material);
  }

  private async generateBarcode(organizationId: string, materialId: string): Promise<string> {

    const materialBarcode = (await this.materialRepo.findOneBy({
      id: materialId
    }))!.barcode;

    const transactionNumber = (await this.transactionRepo.countBy({
      material: {
        id: materialId,
        organizationId
      }
    })) + 1;

    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${materialBarcode} ${transactionNumber}`.toUpperCase();
  }

  async stockIn(data: StockInDto, saveautoSave: boolean = true): Promise<StockTransaction | null> {
    const material = await this.getMaterial(data.materialId);
    const user = await this.userRepo.findOne({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Update material stock
    material.currentStock = Number(material.currentStock) + Number(data.quantity);
    await this.materialRepo.save(material);

    // Generate unique barcode for this stock-in
    const barcode = await this.generateBarcode(data.organizationId, material.id);

    // Create transaction record
    const transaction = this.transactionRepo.create({
      materialId: data.materialId,
      type: TransactionType.STOCK_IN,
      quantity: data.quantity,
      balanceAfter: material.currentStock,
      barcode,
      notes: data.notes,
      createdById: data.userId,
      committed: true
    });

    if (saveautoSave) {
      await this.transactionRepo.save(transaction);

      return this.transactionRepo.findOne({
        where: { id: transaction.id },
        relations: ['material', 'createdBy'],
      });
    }

    return transaction;
  }

  /**
   * Updated stockOut method with task blocking logic
   */
  async stockOut(data: StockOutDto | StockOutCommitTransactionDto): Promise<StockTransaction | null> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let stockTransaction
      const isExistingTransaction = isStockOutCommitTransactionDto(data);
      if (isExistingTransaction) {
        // Checking to see if the stock out transaction exists
        stockTransaction = await this.transactionRepo.findOne({
          where: { id: data.transactionId },
          relations: ['material', 'createdBy', 'material.organization', 'material.createdBy']
        });
      } else {
        // Checking to see if the stock (in) transaction exists with this barcode
        stockTransaction = await this.getTransactionByBarcode(data.barcode);
      }

      if (!stockTransaction) {
        throw new Error('Stock in Transaction not found');
      }

      const material = stockTransaction.material;
      const user = await this.userRepo.findOne({
        where: { id: data.userId },
      });
      if (!user) {
        throw new Error('User not found');
      }

      if (data.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      console.log("About to check material stock sufficiency, material:", material);
      if (Number(material.currentStock) < Number(data.quantity)) {
        throw new Error(`Insufficient stock, available limit: ${material.currentStock}`);
      }
      console.log("Checked material stock sufficiency ✅");

      // If projectId provided, verify it exists
      if (data.projectId) {
        const project = await this.projectRepo.findOne({
          where: { id: data.projectId },
        });
        if (!project) {
          throw new Error('Project not found');
        }
      }

      // Update material stock
      material.currentStock = Number(material.currentStock) - Number(data.quantity);
      await queryRunner.manager.save(material);

      // Create/Update transaction record
      let transaction;
      if (isExistingTransaction) {
        transaction = stockTransaction;
      } else {
        console.log("is not existing transaction");
        transaction = this.transactionRepo.create({
          materialId: material.id,
          type: TransactionType.STOCK_OUT,
          quantity: data.quantity,
          balanceAfter: material.currentStock,
          projectId: data.projectId,
          notes: data.notes,
          createdById: data.userId,
          barcode: stockTransaction.barcode,
          committed: true
        });
      }

      if (data.taskId) {
        transaction.taskId = data.taskId;
      }
      await queryRunner.manager.save(transaction);

      // NEW: Check and block tasks if needed
      await this.checkAndBlockTasksForMaterial(material.id, queryRunner);

      await queryRunner.commitTransaction();

      return this.transactionRepo.findOne({
        where: { id: transaction.id },
        relations: ['material', 'createdBy', 'project'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Checks all PENDING tasks for a material
   * and blocks them if insufficient stock
   */
  private async checkAndBlockTasksForMaterial(
    materialId: string,
    queryRunner: any
  ): Promise<void> {
    // Get the material with current stock
    const material = await queryRunner.manager.findOne(Material, {
      where: { id: materialId },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    // Get all relevant tasks, ordered by priority (higher number = higher priority = first)
    const tasks = await queryRunner.manager.find(Task, {
      where: {
        materialId: materialId,
        // status: Not(In(['completed', 'blocked'])),
        status: In(['pending', 'blocked'])
      },
      order: {
        priority: 'DESC', // Higher priority first
        createdAt: 'ASC',  // If same priority, older tasks first
      },
    });

    if (tasks.length === 0) {
      return;
    }

    let cumulativeDemand = 0;

    // Process each task in priority order
    for (const task of tasks) {
      const taskQuantity = Number(task.productionQuantity || 0);
      
      // Add this task's demand to cumulative
      cumulativeDemand += taskQuantity;

      // Check if task production quantity exceeds available stock
      if (taskQuantity > Number(material.currentStock)) {
        // Block this task due to insufficient stock
        task.status = 'blocked';
        await queryRunner.manager.save(task);
      } else {
        // If task was previously blocked due to stock and now has sufficient stock, unblock it
          if (task.status === 'blocked') {
              task.status = 'pending'; // or whatever default active status you use
              await queryRunner.manager.save(task);
          }
      }
    }

    // Update material's total stock demand
    material.stockDemand = cumulativeDemand;
    await queryRunner.manager.save(material);
  }

  // async stockOut(data: StockOutDto): Promise<StockTransaction | null> {

  //   const stockTransaction = await this.getTransactionByBarcode(data.barcode);

  //   if (!stockTransaction) {
  //     throw new Error('Stock in Transaction not found with the given barcode');
  //   }

  //   const material = stockTransaction.material;
  //   const user = await this.userRepo.findOne({
  //     where: { id: data.userId },
  //   });

  //   if (!user) {
  //     throw new Error('User not found');
  //   }

  //   if (data.quantity <= 0) {
  //     throw new Error('Quantity must be greater than 0');
  //   }

  //   if (Number(material.currentStock) < Number(data.quantity)) {
  //     throw new Error(`Insufficient stock, available limit: ${material.currentStock}`);
  //   }

  //   // If projectId provided, verify it exists
  //   if (data.projectId) {
  //     const project = await this.projectRepo.findOne({
  //       where: { id: data.projectId },
  //     });
  //     if (!project) {
  //       throw new Error('Project not found');
  //     }
  //   }

  //   // Update material stock
  //   material.currentStock = Number(material.currentStock) - Number(data.quantity);
  //   await this.materialRepo.save(material);

  //   // Create transaction record
  //   const transaction = this.transactionRepo.create({
  //     materialId: material.id,
  //     type: TransactionType.STOCK_OUT,
  //     quantity: data.quantity,
  //     balanceAfter: material.currentStock,
  //     projectId: data.projectId,
  //     notes: data.notes,
  //     createdById: data.userId,
  //   });

  //   await this.transactionRepo.save(transaction);

  //   return this.transactionRepo.findOne({
  //     where: { id: transaction.id },
  //     relations: ['material', 'createdBy', 'project'],
  //   });
  // }

  async getMaterialByMaterialBarcode(materialBarcode: string) : Promise<Material | null> {
    return await this.materialRepo.findOne({
      where: { barcode: materialBarcode }
    });
  }

  async getMaterialTransactions(
    materialId: string,
    limit: number = 50,
    type?: TransactionType
  ): Promise<StockTransaction[]> {
    return this.transactionRepo.find({
      where: { materialId, ... type? { type } : {} },
      relations: ['createdBy', 'project'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getTransactionByBarcode(barcode: string): Promise<StockTransaction | null> {
    return this.transactionRepo.findOne({
      where: { barcode, type: TransactionType.STOCK_IN },
      relations: ['material', 'createdBy', 'material.organization', 'material.createdBy'],
    });
  }

  async getTransactions(organizationId: string): Promise<StockTransaction[]> {
    const transactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.material', 'material')
      .where('material.organizationId = :organizationId', { organizationId })
      .orderBy('transaction.createdAt', 'DESC')
      .getMany();

    return transactions;
  }

  async getLowStockMaterials(organizationId: string): Promise<Material[]> {
    return this.materialRepo
      .createQueryBuilder('material')
      .where('material.organizationId = :organizationId', { organizationId })
      .andWhere('material.currentStock <= material.minStockLevel')
      .orderBy('material.currentStock', 'ASC')
      .getMany();
  }

  async getProjectMaterialUsage(projectId: string, organizationId: string): Promise<StockTransaction[]> {
    return this.transactionRepo.find({
      where: { projectId, type: TransactionType.STOCK_OUT, material: { organizationId } },
      relations: ['material', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }
}