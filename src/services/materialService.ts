// src/services/MaterialService.ts
import { Repository } from 'typeorm';
import crypto from 'crypto';
import { Material, MeasureType } from '../models/Material';
import { StockTransaction, TransactionType } from '../models/StockTransaction';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { AppDataSource } from '../data-source';

interface CreateMaterialDto {
  name: string;
  description?: string;
  measureType: MeasureType;
  minStockLevel?: number;
  initialStock?: number;
  organizationId: string;
  createdById: string;
}

interface StockInDto {
  materialId: string;
  quantity: number;
  notes?: string;
  userId: string;
}

interface StockOutDto {
  barcode: string;
  quantity: number;
  projectId?: string;
  notes?: string;
  userId: string;
}

export class MaterialService {
  private materialRepo: Repository<Material>;
  private transactionRepo: Repository<StockTransaction>;
  private organizationRepo: Repository<Organization>;
  private userRepo: Repository<User>;
  private projectRepo: Repository<Project>;

  constructor() {
    this.materialRepo = AppDataSource.getRepository(Material);
    this.transactionRepo = AppDataSource.getRepository(StockTransaction);
    this.organizationRepo = AppDataSource.getRepository(Organization);
    this.userRepo = AppDataSource.getRepository(User);
    this.projectRepo = AppDataSource.getRepository(Project);
  }

  async createMaterial(data: CreateMaterialDto): Promise<Material> {
    // Verify organization exists
    const organization = await this.organizationRepo.findOne({
      where: { id: data.organizationId },
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
      organizationId: data.organizationId,
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
      });
    }

    return material;
  }

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

  private generateBarcode(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `MAT-${timestamp}-${random}`.toUpperCase();
  }

  async stockIn(data: StockInDto): Promise<StockTransaction | null> {
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
    const barcode = this.generateBarcode();

    // Create transaction record
    const transaction = this.transactionRepo.create({
      materialId: data.materialId,
      type: TransactionType.STOCK_IN,
      quantity: data.quantity,
      balanceAfter: material.currentStock,
      barcode,
      notes: data.notes,
      createdById: data.userId,
    });

    await this.transactionRepo.save(transaction);

    return this.transactionRepo.findOne({
      where: { id: transaction.id },
      relations: ['material', 'createdBy'],
    });
  }

  async stockOut(data: StockOutDto): Promise<StockTransaction | null> {

    const stockTransaction = await this.getTransactionByBarcode(data.barcode);

    if (!stockTransaction) {
      throw new Error('Stock in Transaction not found with the given barcode');
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

    if (Number(material.currentStock) < Number(data.quantity)) {
      throw new Error('Insufficient stock');
    }

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
    await this.materialRepo.save(material);

    // Create transaction record
    const transaction = this.transactionRepo.create({
      materialId: material.id,
      type: TransactionType.STOCK_OUT,
      quantity: data.quantity,
      balanceAfter: material.currentStock,
      projectId: data.projectId,
      notes: data.notes,
      createdById: data.userId,
    });

    await this.transactionRepo.save(transaction);

    return this.transactionRepo.findOne({
      where: { id: transaction.id },
      relations: ['material', 'createdBy', 'project'],
    });
  }

  async getMaterialTransactions(
    materialId: string,
    limit: number = 50
  ): Promise<StockTransaction[]> {
    return this.transactionRepo.find({
      where: { materialId },
      relations: ['createdBy', 'project'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getTransactionByBarcode(barcode: string): Promise<StockTransaction | null> {
    return this.transactionRepo.findOne({
      where: { barcode },
      relations: ['material', 'createdBy', 'material.organization', 'material.createdBy'],
    });
  }

  async getLowStockMaterials(organizationId: string): Promise<Material[]> {
    return this.materialRepo
      .createQueryBuilder('material')
      .where('material.organizationId = :organizationId', { organizationId })
      .andWhere('material.currentStock <= material.minStockLevel')
      .orderBy('material.currentStock', 'ASC')
      .getMany();
  }

  async getProjectMaterialUsage(projectId: string): Promise<StockTransaction[]> {
    return this.transactionRepo.find({
      where: { projectId, type: TransactionType.STOCK_OUT },
      relations: ['material', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }
}