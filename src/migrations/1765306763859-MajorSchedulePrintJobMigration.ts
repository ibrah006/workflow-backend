import { MigrationInterface, QueryRunner } from "typeorm";

export class MajorSchedulePrintJobMigration1765306763859 implements MigrationInterface {
    name = 'MajorSchedulePrintJobMigration1765306763859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_39728fe700699caa76a2a9c5f20"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ALTER COLUMN "projectId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_39728fe700699caa76a2a9c5f20" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_39728fe700699caa76a2a9c5f20"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ALTER COLUMN "projectId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_39728fe700699caa76a2a9c5f20" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
