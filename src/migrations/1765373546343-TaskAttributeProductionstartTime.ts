import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskAttributeProductionstartTime1765373546343 implements MigrationInterface {
    name = 'TaskAttributeProductionstartTime1765373546343'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "productionStartTime" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "productionStartTime"`);
    }

}
