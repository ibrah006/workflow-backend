import { MigrationInterface, QueryRunner } from "typeorm";

export class PrinterActivityTracking1766310446906 implements MigrationInterface {
    name = 'PrinterActivityTracking1766310446906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" ADD "workMinutes" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "printers" ADD "maintenanceMinutes" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "printers" ADD "scheduledMinutes" integer NOT NULL DEFAULT '480'`);
        await queryRunner.query(`ALTER TABLE "printers" ADD "statusLastUpdatedAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" DROP COLUMN "statusLastUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP COLUMN "scheduledMinutes"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP COLUMN "maintenanceMinutes"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP COLUMN "workMinutes"`);
    }

}
