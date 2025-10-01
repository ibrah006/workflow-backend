import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    OneToOne,
    ManyToOne,
  } from "typeorm";
  import { User } from "./User";
import { Project } from "./Project";
  
  // Made some of the required parameters (in production) as optional temporarily
@Entity()
export class Company {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;
  
    @Column({nullable: true})
    description!: string;
  
    // Whether company profile ACTIVE or CLOSED
    @Column({ default: true, nullable: false })
    isActive?: boolean;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  
    @ManyToOne(()=> User, { nullable: false })
    createdBy!: User;

    @OneToMany(()=> Project, (project)=> project.client)
    projects!: Project[];
}
  