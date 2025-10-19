import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
  } from 'typeorm';
  import { Organization } from './Organization';
  import { User } from './User';
  
  export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
  }
  
  @Entity('invitations')
  @Index(['email', 'organizationId', 'status'])
  export class Invitation {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ type: 'varchar', length: 255 })
    @Index()
    email!: string;
  
    @Column({
      type: 'enum',
      enum: InvitationStatus,
      default: InvitationStatus.PENDING,
    })
    status!: InvitationStatus;
  
    @Column({ type: 'uuid' })
    @Index()
    token!: string;
  
    @Column({ type: 'timestamp' })
    expiresAt!: Date;
  
    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    organization!: Organization;
  
    @Column()
    @Index()
    organizationId!: string;
  
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    invitedBy!: User;
  
    @Column({ type: 'varchar', length: 100 })
    role!: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }