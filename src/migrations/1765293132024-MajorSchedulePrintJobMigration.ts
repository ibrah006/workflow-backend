import { MigrationInterface, QueryRunner } from "typeorm";

export class MajorSchedulePrintJobMigration1765293132024 implements MigrationInterface {
    name = 'MajorSchedulePrintJobMigration1765293132024'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_21983d9c4d3691a6cc6edafa411"`);
        await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "materials_org_name_unique"`);
        await queryRunner.query(`CREATE TABLE "task_progress_logs_progress_log" ("taskId" integer NOT NULL, "progressLogId" uuid NOT NULL, CONSTRAINT "PK_35e8c5fe4a614ef68c5a2ef748e" PRIMARY KEY ("taskId", "progressLogId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_db8a45557e11bb2b79d3f5a548" ON "task_progress_logs_progress_log" ("taskId") `);
        await queryRunner.query(`CREATE INDEX "IDX_018f2f74f24f42bd526cb5ba89" ON "task_progress_logs_progress_log" ("progressLogId") `);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP COLUMN "taskId"`);
        await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "materials" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" ADD CONSTRAINT "FK_db8a45557e11bb2b79d3f5a5481" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" ADD CONSTRAINT "FK_018f2f74f24f42bd526cb5ba896" FOREIGN KEY ("progressLogId") REFERENCES "progress_log"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" DROP CONSTRAINT "FK_018f2f74f24f42bd526cb5ba896"`);
        await queryRunner.query(`ALTER TABLE "task_progress_logs_progress_log" DROP CONSTRAINT "FK_db8a45557e11bb2b79d3f5a5481"`);
        await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "materials" ADD "name" citext NOT NULL`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD "taskId" integer NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_018f2f74f24f42bd526cb5ba89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_db8a45557e11bb2b79d3f5a548"`);
        await queryRunner.query(`DROP TABLE "task_progress_logs_progress_log"`);
        await queryRunner.query(`ALTER TABLE "materials" ADD CONSTRAINT "materials_org_name_unique" UNIQUE ("name", "organizationId")`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_21983d9c4d3691a6cc6edafa411" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
