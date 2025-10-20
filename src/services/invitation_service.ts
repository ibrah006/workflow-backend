import { Repository } from 'typeorm';
import crypto from 'crypto';
import { AppDataSource } from '../data-source';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Invitation, InvitationStatus } from '../models/Invitation';
import { v4 as uuidv4 } from 'uuid';

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

    // Check if user is already a member
    // Assuming you have a membership/organization_users table
    // Add your own logic here

    // Generate unique token
    const token = uuidv4();

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = this.invitationRepo.create({
      email,
      organizationId,
      invitedBy: { id: invitedById },
      token,
      expiresAt,
      role,
      status: InvitationStatus.PENDING,
    });

    const savedInvitation = await this.invitationRepo.save(invitation);

    // TODO: Send invitation email
    // await this.emailService.sendInvitationEmail(email, token, organization.name);

    return {
      ...savedInvitation,
      organization: organization
    };
  }

  async cancelInvitation(
    invitationId: string,
    userId: string
  ): Promise<Invitation> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
      relations: ['organization', 'invitedBy'],
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      // Only pending invitations can be cancelled

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new Error('This Invitation cannot be cancelled as it has already been accepted by the user');
      }

      throw new Error('This invitation has already been cancelled (by someone) or is expired');
    }

    // Verify user has permission to cancel (org admin or the inviter)
    // Add your authorization logic here
    if (invitation.invitedBy.id !== userId) {
      // Check if user is org admin
      throw new Error('Unauthorized to cancel this invitation');
    }

    invitation.status = InvitationStatus.CANCELLED;
    const savedInvitation = await this.invitationRepo.save(invitation);

    return savedInvitation;
  }

  async getOrganizationInvitations(
    organizationId: string,
    status?: InvitationStatus
  ): Promise<Invitation[]> {
    const where: any = { organizationId, status: InvitationStatus.PENDING };
    if (status) {
      where.status = status;
    }

    return this.invitationRepo.find({
      where,
      relations: ['invitedBy', 'organization'],
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

  async acceptInvitation(token: string): Promise<void> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      // Invalid or expired invitation or cancelled invitation
      throw new Error('This Invitation has been cancelled or expired');
    }

    // Add user to organization
    // Implement your logic to add user to organization

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepo.save(invitation);
  }

  async getUserPendingInvitations(email: string): Promise<Invitation[]> {
    return this.invitationRepo.find({
      where: {
        email,
        status: InvitationStatus.PENDING,
      },
      relations: ['organization', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}