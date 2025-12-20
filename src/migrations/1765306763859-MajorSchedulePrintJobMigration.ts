import { MigrationInterface, QueryRunner } from "typeorm";
import { addForeignKeyIfNotExists } from "./functions/add_foreign_keys_ifnotexists";

export class MajorSchedulePrintJobMigration1765306763859 implements MigrationInterface {
    name = 'MajorSchedulePrintJobMigration1765306763859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_39728fe700699caa76a2a9c5f20"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ALTER COLUMN "projectId" SET NOT NULL`);
        await addForeignKeyIfNotExists(
            queryRunner,
            {
                table: 'progress_log',
                constraintName: 'FK_39728fe700699caa76a2a9c5f20',
                column: 'projectId',
                referencedTable: 'project',
                referencedColumn: 'id',
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            }
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_39728fe700699caa76a2a9c5f20"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ALTER COLUMN "projectId" DROP NOT NULL`);
        await addForeignKeyIfNotExists(
            queryRunner,
            {
                table: 'progress_log',
                constraintName: 'FK_39728fe700699caa76a2a9c5f20',
                column: 'projectId',
                referencedTable: 'project',
                referencedColumn: 'id',
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            }
        );
    }

}
