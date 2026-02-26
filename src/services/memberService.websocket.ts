import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import * as bcrypt from 'bcrypt';
import { getMemberWebSocketService } from '../websocket/member.websocketSetup';

export class MemberService {
  private userRepo: Repository<User>;
  private organizationRepo: Repository<Organization>;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
    this.organizationRepo = AppDataSource.getRepository(Organization);
  }

  /**
   * Invite/Create a new member and broadcast to WebSocket
   */
  async inviteMember(
    memberData: Partial<User>,
    invitedBy: string,
    organizationId: string
  ): Promise<User> {
    // Verify organization exists
    const organization = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check if email already exists
    const existingUser = await this.userRepo.findOne({
      where: { email: memberData.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password (or generate temporary password for invitation)
    const tempPassword = memberData.password || this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create member
    const member = this.userRepo.create({
      ...memberData,
      password: hashedPassword,
      organization,
      role: memberData.role || 'viewer',
    });

    await this.userRepo.save(member);

    // Load full member with relations
    const fullMember = await this.userRepo.findOne({
      where: { id: member.id },
      relations: ['organization', 'department'],
    });

    if (fullMember) {
      // Broadcast member creation to WebSocket
      try {
        const wsService = getMemberWebSocketService();
        wsService.broadcastMemberCreated(organizationId, fullMember, invitedBy);
      } catch (error) {
        console.error('Failed to broadcast member creation:', error);
      }

      // TODO: Send invitation email with temporary password
      // await this.emailService.sendInvitationEmail(member.email, tempPassword);
    }

    return fullMember || member;
  }

  /**
   * Update member and broadcast changes
   */
  async updateMember(
    memberId: string,
    updates: Partial<User>,
    updatedBy: string,
    organizationId: string
  ): Promise<User> {
    // Find member with organization validation
    const member = await this.userRepo.findOne({
      where: { id: memberId },
      relations: ['organization', 'department'],
    });

    if (!member || member.organization?.id !== organizationId) {
      throw new Error('Member not found or access denied');
    }

    // Track changes for WebSocket broadcast
    const changes: Record<string, any> = {};

    // Apply updates (excluding sensitive fields)
    const allowedUpdates = ['name', 'role', 'phone', 'skills', 'department'];
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key) && updates[key as keyof User] !== undefined) {
        const oldValue = member[key as keyof User];
        const newValue = updates[key as keyof User];
        if (oldValue !== newValue) {
          changes[key] = { old: oldValue, new: newValue };
          (member as any)[key] = newValue;
        }
      }
    });

    await this.userRepo.save(member);

    // Load full member with relations
    const updatedMember = await this.userRepo.findOne({
      where: { id: memberId },
      relations: ['organization', 'department'],
    });

    if (updatedMember) {
      try {
        const wsService = getMemberWebSocketService();
        
        // Broadcast general update
        wsService.broadcastMemberUpdated(organizationId, updatedMember, updatedBy, changes);

        // Broadcast specific role change if role was updated
        if (changes.role) {
          wsService.broadcastMemberRoleChanged(
            organizationId,
            memberId,
            updatedMember.role,
            updatedBy
          );
        }
      } catch (error) {
        console.error('Failed to broadcast member update:', error);
      }
    }

    return updatedMember || member;
  }

  /**
   * Change member role
   */
  async changeMemberRole(
    memberId: string,
    newRole: string,
    changedBy: string,
    organizationId: string
  ): Promise<User> {
    const member = await this.userRepo.findOne({
      where: { id: memberId },
      relations: ['organization'],
    });

    if (!member || member.organization?.id !== organizationId) {
      throw new Error('Member not found or access denied');
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'designer', 'delivery', 'viewer'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role');
    }

    member.role = newRole;
    await this.userRepo.save(member);

    // Broadcast role change
    try {
      const wsService = getMemberWebSocketService();
      wsService.broadcastMemberRoleChanged(organizationId, memberId, newRole, changedBy);
    } catch (error) {
      console.error('Failed to broadcast role change:', error);
    }

    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    memberId: string,
    removedBy: string,
    organizationId: string
  ): Promise<void> {
    const member = await this.userRepo.findOne({
      where: { id: memberId },
      relations: ['organization'],
    });

    if (!member || member.organization?.id !== organizationId) {
      throw new Error('Member not found or access denied');
    }

    // Don't allow removing yourself
    if (memberId === removedBy) {
      throw new Error('Cannot remove yourself from the organization');
    }

    // Option 1: Soft delete - remove organization association
    member.organization = undefined;
    await this.userRepo.save(member);

    // Option 2: Hard delete (uncomment if preferred)
    // await this.userRepo.remove(member);

    // Broadcast deletion
    try {
      const wsService = getMemberWebSocketService();
      wsService.broadcastMemberRemoved(organizationId, memberId, removedBy);
    } catch (error) {
      console.error('Failed to broadcast member removal:', error);
    }
  }

  /**
   * Get all members for an organization
   */
  async getOrganizationMembers(
    organizationId: string,
    filters?: {
      role?: string;
      departmentId?: string;
      search?: string;
    }
  ): Promise<User[]> {
    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.organization.id = :organizationId', { organizationId });

    if (filters?.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters?.departmentId) {
      queryBuilder.andWhere('user.department.id = :departmentId', { 
        departmentId: filters.departmentId 
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get single member
   */
  async getMember(memberId: string, organizationId: string): Promise<User> {
    const member = await this.userRepo.findOne({
      where: { id: memberId },
      relations: ['organization', 'department', 'tasks'],
    });

    if (!member || member.organization?.id !== organizationId) {
      throw new Error('Member not found or access denied');
    }

    return member;
  }

  /**
   * Get members by role
   */
  async getMembersByRole(
    organizationId: string,
    role: string
  ): Promise<User[]> {
    return this.userRepo.find({
      where: {
        organization: { id: organizationId },
        role,
      },
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Search members
   */
  async searchMembers(
    organizationId: string,
    searchTerm: string
  ): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.organization', 'organization')
      .where('user.organization.id = :organizationId', { organizationId })
      .andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${searchTerm}%` }
      )
      .orderBy('user.name', 'ASC')
      .getMany();
  }

  /**
   * Generate temporary password for new members
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}