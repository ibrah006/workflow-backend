import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskAttribCompletedAt1766397671520 implements MigrationInterface {
    name = 'TaskAttribCompletedAt1766397671520'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "completedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "completedAt"`);
    }

}
