import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Task } from "./Task";
import { User } from "./User";


@Entity()
export class Project {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    description?: string;

    @Column()
    status!: string;

    @Column({ type: 'date' })
    dueDate?: Date;

    @Column({ type: 'date', nullable: true })
    estimatedProductionStart?: Date;

    @Column({ type: 'date', nullable: true })
    estimatedSiteFixing?: Date;

    @OneToMany(()=> Task, (task)=> task.project)
    tasks!: Task[];

    @ManyToMany(()=> User, (user)=> user.managedProjects)
    @JoinTable()
    assignedManagers!: User[];

    // derived attributes (NOTE FOR THE FRONT-END):
    // project efficiency

}