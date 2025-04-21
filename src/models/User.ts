import { Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserRole } from "../enums/UserRoles";
import { Team } from "./Team";
import { Task } from "./Task";
import { Message } from "./Message";


@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.VIEWER
    })
    role!: UserRole;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @Column({ nullable: true })
    phone: number | undefined;

    @ManyToOne(()=> Team, (team)=> team.members)
    department!: Team;

    @CreateDateColumn()
    createdAt!: Date;

    // Skill tags
    // will be useful in the app for auto assigning users to tasks/projects
    @Column('text', { array: true })
    skills!: string[];

    @Column('decimal', { default: 0.0 })
    efficiencyScore!: number;

    @Column({ type: 'interval' })
    duration: any;

    // Tasks History relations
    @ManyToMany(()=> Task, (task)=> task.assignees)
    tasks!: Task[];


    // Other Attributes

    @ManyToOne(()=> Team, (team)=> team.createdBy, { nullable: true })
    teamsCreated?: Team[];

    @ManyToOne(()=> Message, (message)=> message.user, { nullable: true })
    messages?: Message[];

    // List of projects the user has been part of, as a manager
    @ManyToOne(()=> Message, (message)=> message.user, { nullable: true })
    managedProjects?: Message[];
}