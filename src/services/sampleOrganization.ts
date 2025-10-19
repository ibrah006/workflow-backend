import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

export class SampleOrganizationService {
  private organizationRepo: Repository<Organization>;
  private userRepo: Repository<User>;

  constructor() {
    this.organizationRepo = AppDataSource.getRepository(Organization);
    this.userRepo = AppDataSource.getRepository(User);
  }

  /**
   * Creates a sample organization for a user to explore the app
   * Marks it as a sample/demo organization
   */
  async createSampleOrganization(userId: string): Promise<Organization> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a sample organization
    const existingSample = await this.organizationRepo.findOne({
      where: {
        createdBy: {id: userId},
        isSample: true,
      },
    });

    if (existingSample) {
      throw new Error('User already has a sample organization');
    }

    // Create the sample organization
    const sampleOrg = this.organizationRepo.create({
      name: 'My Company',
      isSample: true,
      description: 'A sample organization to explore the app',
      createdBy: { id: userId },
    });

    await this.organizationRepo.save(sampleOrg);

    // TODO: Create sample data
    // - Add sample projects
    // - Add sample tasks
    // - Add sample team members (fake/demo data)
    // await this.createSampleData(sampleOrg.id);

    return sampleOrg;
  }

  /**
   * Deletes the user's sample organization
   */
  async deleteSampleOrganization(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const organization = await this.organizationRepo.findOne({
      where: {
        id: organizationId,
        createdBy: {id: userId},
        isSample: true,
      },
    });

    if (!organization) {
      throw new Error(
        'Sample organization not found or user does not have permission'
      );
    }

    // Delete the organization (cascade will handle related data)
    await this.organizationRepo.remove(organization);
  }

  /**
   * Gets the user's sample organization if it exists
   */
  async getUserSampleOrganization(
    userId: string
  ): Promise<Organization | null> {
    return this.organizationRepo.findOne({
      where: {
        createdBy: {id: userId},
        isSample: true,
      },
    });
  }

  /**
   * Converts a sample organization to a real one
   * (User decides to keep it instead of deleting)
   */
  async convertSampleToReal(
    userId: string,
    organizationId: string,
    newName?: string
  ): Promise<Organization> {
    const organization = await this.organizationRepo.findOne({
      where: {
        id: organizationId,
        createdBy: {id: userId},
        isSample: true,
      },
    });

    if (!organization) {
      throw new Error(
        'Sample organization not found or user does not have permission'
      );
    }

    // Update organization
    organization.isSample = false;
    if (newName) {
      organization.name = newName;
    }

    await this.organizationRepo.save(organization);

    // TODO: Clean up any demo/fake data if needed
    // await this.cleanupSampleData(organizationId);

    return organization;
  }

  /**
   * Helper method to create sample data for the organization
   * (Implement based on your app's needs)
   */
  private async createSampleData(organizationId: string): Promise<void> {
    // TODO: Implement sample data creation
    // Examples:
    // - Create sample projects
    // - Create sample tasks with various statuses
    // - Create sample team members (fake data)
    // - Create sample documents
    // This helps users understand the app's features
  }

  /**
   * Helper method to clean up demo data when converting to real org
   */
  private async cleanupSampleData(organizationId: string): Promise<void> {
    // TODO: Implement cleanup logic
    // Remove fake team members, demo tasks, etc.
  }
}