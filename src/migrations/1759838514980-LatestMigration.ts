import { MigrationInterface, QueryRunner } from "typeorm";

export class LatestMigration1759838514980 implements MigrationInterface {
    name = 'LatestMigration1759838514980'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" ADD "tasksLastModifiedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "tasksLastModifiedAt"`);
    }

}
