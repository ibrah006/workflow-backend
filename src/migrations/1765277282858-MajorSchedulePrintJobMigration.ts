import { MigrationInterface, QueryRunner } from "typeorm";

export class MajorSchedulePrintJobMigration1765277282858 implements MigrationInterface {
    name = 'MajorSchedulePrintJobMigration1765277282858'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_11c1f96bc242b84517d279d471c"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "progressLogId"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "task" ADD "runs" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "task" ADD "productionDuration" integer`);
        await queryRunner.query(`ALTER TABLE "task" ADD "materialId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" ADD "department" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_388081a3e1332355fc4d95fba62" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_388081a3e1332355fc4d95fba62"`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" DROP COLUMN "department"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "materialId"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "productionDuration"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "runs"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "task" ADD "progressLogId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_11c1f96bc242b84517d279d471c" FOREIGN KEY ("progressLogId") REFERENCES "progress_log"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
