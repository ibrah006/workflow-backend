import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Task } from "./Task";
import { MaterialLogType } from "../enums/MaterialLogType";

@Entity()
export class MaterialLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column() // for description
    description!: string;

    @Column()
    quantity!: number;

    @Column({ type: 'decimal' })
    width!: number;
    
    @Column({ type: 'decimal' })
    height!: number;

    @ManyToOne(()=> User, (user)=> user.materialLogs)
    loggedBy!: User;

    @ManyToOne(()=> Task, (task)=> task.materialsUsed, { nullable: true })
    task?: Task;

    @CreateDateColumn({ type: 'timestamptz' })
    dateCreated!: Date;

    @Column({
        type: 'enum',
        enum: MaterialLogType,
    })
    type!: MaterialLogType;

    // Accept string input temporarily
    private _inputType?: string;

    // Accepts input as string
    set typeInput(value: string) {
        this._inputType = value;
    }

    // Lifecycle hook to convert string to enum before saving
    @BeforeInsert()
    @BeforeUpdate()
    convertTypeToEnum() {
        if (this._inputType) {
            const upper = this._inputType.toUpperCase().trim();
            if (!(upper in MaterialLogType)) {
                throw new Error(`Invalid MaterialLogType: ${this._inputType}`);
            }
            this.type = MaterialLogType[upper as keyof typeof MaterialLogType];
        }
    }
}