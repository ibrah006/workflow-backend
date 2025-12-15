import { MigrationInterface, QueryRunner } from "typeorm";

export class TasksRelationsFROMProgressLogEntity1765788563681 implements MigrationInterface {
    name = 'TasksRelationsFROMProgressLogEntity1765788563681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" DROP CONSTRAINT "FK_018f2f74f24f42bd526cb5ba896"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD "tasksId" integer`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_c4014c60c9760c066e3d3818a52" FOREIGN KEY ("tasksId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" ADD CONSTRAINT "FK_018f2f74f24f42bd526cb5ba896" FOREIGN KEY ("progressLogId") REFERENCES "progress_log"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" DROP CONSTRAINT "FK_018f2f74f24f42bd526cb5ba896"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_c4014c60c9760c066e3d3818a52"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP COLUMN "tasksId"`);
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" ADD CONSTRAINT "FK_018f2f74f24f42bd526cb5ba896" FOREIGN KEY ("progressLogId") REFERENCES "progress_log"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
