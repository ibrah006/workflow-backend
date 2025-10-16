import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Task } from "./Task";
import { MaterialLogType } from "../enums/MaterialLogType";

@Entity()
export class MaterialLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column() // for description
    description!: string;

    // quantity or roll meter
    @Column({ type: 'decimal' })
    measure!: number;

    @ManyToOne(()=> User, (user)=> user.materialLogs)
    loggedBy!: User;

    @ManyToOne(()=> Task, (task)=> task.materialsUsed, { nullable: true })
    materialsUsedTask?: Task;

    @Column({ type: 'timestamp' })
    datetime!: Date;

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