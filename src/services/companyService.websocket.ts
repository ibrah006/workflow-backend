import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Company } from '../models/Company';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { getCompanyWebSocketService } from '../websocket/company.websocketSetup';
// import { getCompanyWebSocketService } from './companyWebsocketSetup';

export class CompanyService {
  private companyRepo: Repository<Company>;
  private organizationRepo: Repository<Organization>;
  private userRepo: Repository<User>;

  constructor() {
    this.companyRepo = AppDataSource.getRepository(Company);
    this.organizationRepo = AppDataSource.getRepository(Organization);
    this.userRepo = AppDataSource.getRepository(User);
  }

  /**
   * Create a new company and broadcast to WebSocket
   */
  async createCompany(
    companyData: Partial<Company>,
    userId: string,
    organizationId: string
  ): Promise<Company> {
    // Verify organization exists
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Get user who is creating the company
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create company
    const company = this.companyRepo.create({
      ...companyData,
      organizationId,
      createdBy: user,
      isActive: companyData.isActive !== undefined ? companyData.isActive : true,
    });

    await this.companyRepo.save(company);

    // Load full company with relations for response
    const fullCompany = await this.companyRepo.findOne({
      where: { id: company.id },
      relations: ['organization', 'createdBy', 'projects'],
    });

    if (fullCompany) {
      // Broadcast company creation to WebSocket
      try {
        const wsService = getCompanyWebSocketService();
        wsService.broadcastCompanyCreated(organizationId, fullCompany, userId);
      } catch (error) {
        console.error('Failed to broadcast company creation:', error);
        // Don't fail the operation if WebSocket broadcast fails
      }
    }

    return fullCompany || company;
  }

  /**
   * Update a company and broadcast changes
   */
  async updateCompany(
    companyId: string,
    updates: Partial<Company>,
    userId: string,
    organizationId: string
  ): Promise<Company> {
    // Find company with organization validation
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['organization', 'createdBy'],
    });

    if (!company || company.organizationId !== organizationId) {
      throw new Error('Company not found or access denied');
    }

    // Track changes for WebSocket broadcast
    const changes: Record<string, any> = {};
    const oldIsActive = company.isActive;

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key in company && updates[key as keyof Company] !== undefined) {
        const oldValue = company[key as keyof Company];
        const newValue = updates[key as keyof Company];
        if (oldValue !== newValue) {
          changes[key] = { old: oldValue, new: newValue };
          (company as any)[key] = newValue;
        }
      }
    });

    await this.companyRepo.save(company);

    // Load full company with relations
    const updatedCompany = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['organization', 'createdBy', 'projects'],
    });

    if (updatedCompany) {
      try {
        const wsService = getCompanyWebSocketService();
        
        // Broadcast general update
        wsService.broadcastCompanyUpdated(organizationId, updatedCompany, userId, changes);

        // Broadcast specific status change if isActive was updated
        if (changes.isActive && oldIsActive !== updatedCompany.isActive) {
          wsService.broadcastCompanyStatusChanged(
            organizationId,
            companyId,
            updatedCompany.isActive!,
            userId
          );
        }
      } catch (error) {
        console.error('Failed to broadcast company update:', error);
      }
    }

    return updatedCompany || company;
  }

  /**
   * Delete a company and broadcast
   */
  async deleteCompany(
    companyId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['organization'],
    });

    if (!company || company.organizationId !== organizationId) {
      throw new Error('Company not found or access denied');
    }

    await this.companyRepo.remove(company);

    // Broadcast deletion
    try {
      const wsService = getCompanyWebSocketService();
      wsService.broadcastCompanyDeleted(organizationId, companyId, userId);
    } catch (error) {
      console.error('Failed to broadcast company deletion:', error);
    }
  }

  /**
   * Toggle company active status
   */
  async toggleCompanyStatus(
    companyId: string,
    userId: string,
    organizationId: string
  ): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['organization', 'createdBy'],
    });

    if (!company || company.organizationId !== organizationId) {
      throw new Error('Company not found or access denied');
    }

    company.isActive = !company.isActive;
    await this.companyRepo.save(company);

    // Broadcast status change
    try {
      const wsService = getCompanyWebSocketService();
      wsService.broadcastCompanyStatusChanged(
        organizationId,
        companyId,
        company.isActive!,
        userId
      );
    } catch (error) {
      console.error('Failed to broadcast status change:', error);
    }

    return company;
  }

  /**
   * Get all companies for an organization
   */
  async getOrganizationCompanies(
    organizationId: string,
    filters?: {
      isActive?: boolean;
      industry?: string;
      search?: string;
    }
  ): Promise<Company[]> {
    const queryBuilder = this.companyRepo
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.organization', 'organization')
      .leftJoinAndSelect('company.createdBy', 'createdBy')
      .leftJoinAndSelect('company.projects', 'projects')
      .where('company.organizationId = :organizationId', { organizationId });

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('company.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.industry) {
      queryBuilder.andWhere('company.industry = :industry', { industry: filters.industry });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(company.name ILIKE :search OR company.description ILIKE :search OR company.contactName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('company.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get single company
   */
  async getCompany(companyId: string, organizationId: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: [
        'organization',
        'createdBy',
        'projects',
        'projects.tasks',
      ],
    });

    if (!company || company.organizationId !== organizationId) {
      throw new Error('Company not found or access denied');
    }

    return company;
  }

  /**
   * Get active companies
   */
  async getActiveCompanies(organizationId: string): Promise<Company[]> {
    return this.companyRepo.find({
      where: {
        organizationId,
        isActive: true,
      },
      relations: ['createdBy', 'organization'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get companies by industry
   */
  async getCompaniesByIndustry(
    organizationId: string,
    industry: string
  ): Promise<Company[]> {
    return this.companyRepo.find({
      where: {
        organizationId,
        industry,
      },
      relations: ['createdBy', 'organization'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Search companies
   */
  async searchCompanies(
    organizationId: string,
    searchTerm: string
  ): Promise<Company[]> {
    return this.companyRepo
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.createdBy', 'createdBy')
      .leftJoinAndSelect('company.organization', 'organization')
      .where('company.organizationId = :organizationId', { organizationId })
      .andWhere(
        '(company.name ILIKE :search OR company.description ILIKE :search OR company.contactName ILIKE :search OR company.email ILIKE :search)',
        { search: `%${searchTerm}%` }
      )
      .orderBy('company.name', 'ASC')
      .getMany();
  }
}