import { Repository } from 'typeorm';
import crypto from 'crypto';
import { AppDataSource } from '../data-source';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Invitation, InvitationStatus } from '../models/Invitation';

export class InvitationService {
  private invitationRepo: Repository<Invitation>;
  private organizationRepo: Repository<Organization>;
  private userRepo: Repository<User>;

  constructor() {
    this.invitationRepo = AppDataSource.getRepository(Invitation);
    this.organizationRepo = AppDataSource.getRepository(Organization);
    this.userRepo = AppDataSource.getRepository(User);
  }

  async sendInvitation(
    email: string,
    organizationId: string,
    invitedById: string,
    role: string = 'member'
  ): Promise<Invitation> {
    // Check if organization exists
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check if inviter is part of the organization
    const inviter = await this.userRepo.findOne({
      where: { id: invitedById },
    });
    if (!inviter) {
      throw new Error('Inviter not found');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.invitationRepo.findOne({
      where: {
        email,
        organizationId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new Error('An active invitation already exists for this email');
    }

    // Check if user is already a member
    // Assuming you have a membership/organization_users table
    // Add your own logic here

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = this.invitationRepo.create({
      email,
      organizationId,
      invitedById,
      token,
      expiresAt,
      role,
      status: InvitationStatus.PENDING,
    });

    await this.invitationRepo.save(invitation);

    // TODO: Send invitation email
    // await this.emailService.sendInvitationEmail(email, token, organization.name);

    return invitation;
  }

  async cancelInvitation(
    invitationId: string,
    userId: string
  ): Promise<Invitation> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Only pending invitations can be cancelled');
    }

    // Verify user has permission to cancel (org admin or the inviter)
    // Add your authorization logic here
    if (invitation.invitedById !== userId) {
      // Check if user is org admin
      // throw new Error('Unauthorized to cancel this invitation');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationRepo.save(invitation);

    return invitation;
  }

  async getOrganizationInvitations(
    organizationId: string,
    status?: InvitationStatus
  ): Promise<Invitation[]> {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }

    return this.invitationRepo.find({
      where,
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const invitation = await this.invitationRepo.findOne({
      where: { token, status: InvitationStatus.PENDING },
      relations: ['organization'],
    });

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepo.save(invitation);
      return null;
    }

    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Add user to organization
    // Implement your logic to add user to organization

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepo.save(invitation);
  }
}