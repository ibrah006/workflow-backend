import { MigrationInterface, QueryRunner } from "typeorm";

export class MajorSchedulePrintJobMigration1765281106074 implements MigrationInterface {
    name = 'MajorSchedulePrintJobMigration1765281106074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" ADD "taskId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_21983d9c4d3691a6cc6edafa411" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_21983d9c4d3691a6cc6edafa411"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP COLUMN "taskId"`);
    }

}
