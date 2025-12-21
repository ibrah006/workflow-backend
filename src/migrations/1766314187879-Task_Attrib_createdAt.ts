import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskAttribCreatedAt1766314187879 implements MigrationInterface {
    name = 'TaskAttribCreatedAt1766314187879'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "createdAt"`);
    }

}
