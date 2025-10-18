import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserRole } from "../enums/UserRoles";
import { Team } from "./Team";
import { Task } from "./Task";
import { Message } from "./Message";
import { WorkActivityLog } from "./WorkActivityLog";
import { Project } from "./Project";
import { AttendanceLog } from "./AttendanceLog";
import { LayoffLog } from "./LayoffLog";
import { MaterialLog } from "./MaterialLog";
import { Organization } from "./Organization";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({
        // enum: UserRole,
        default: 'viewer'
    })
    role!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @Column({ nullable: true })
    phone?: number;

    @ManyToOne(()=> Team, (team)=> team.members)
    department?: Team;

    @CreateDateColumn()
    createdAt!: Date;

    // Skill tags
    // will be useful in the app for auto assigning users to tasks/projects
    @Column('text', { array: true, default: [] })
    skills!: string[];

    @Column('decimal', { default: 0.0 })
    efficiencyScore!: number;

    // Total work duration
    @Column({ type: "int", default: 0 })
    duration!: number;

    // Tasks History relations
    @ManyToMany(()=> Task, (task)=> task.assignees)
    tasks!: Task[];

    @ManyToOne(()=> Organization, (org)=> org.users)
    organization!: Organization;

    // Other Attributes

    @OneToMany(()=> Team, (team)=> team.createdBy, { nullable: true })
    teamsCreated?: Team[];

    @OneToMany(()=> Message, (message)=> message.user, { nullable: true })
    messages?: Message[];

    // List of projects the user has been part of, as a manager
    @ManyToMany(()=> Project, (project)=> project.assignedManagers, { nullable: true })
    managedProjects?: Project[];

    @OneToMany(()=> WorkActivityLog, (log)=> log.user, { nullable: true })
    workActivityLogs?: WorkActivityLog[];

    @OneToMany(()=> AttendanceLog, (log)=> log.user, { nullable: true })
    attendanceLogs?: AttendanceLog[];
    
    @OneToMany(()=> LayoffLog, (log)=> log.user, { nullable: true })
    layoffLogs?: LayoffLog[];

    // List of Material logs initiated by the User
    @OneToMany(()=> MaterialLog, (log)=> log.loggedBy)
    materialLogs!: MaterialLog[];

    // Backend logic functions

    isAdmin(): boolean {
        return this.role === "admin" || this.role === "manager";
    }

    static isAdmin(role: string) : boolean {
        return role === "admin" || role === "manager";
    }
}