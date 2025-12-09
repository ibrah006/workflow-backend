import { MigrationInterface, QueryRunner } from "typeorm";

export class PrinterAndTaskRelation1765103782019 implements MigrationInterface {
    name = 'PrinterAndTaskRelation1765103782019'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_e970f09040e68e046173e6a133d"`);
        await queryRunner.query(`ALTER TABLE "printers" ALTER COLUMN "currentTaskId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_e970f09040e68e046173e6a133d" FOREIGN KEY ("currentTaskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_e970f09040e68e046173e6a133d"`);
        await queryRunner.query(`ALTER TABLE "printers" ALTER COLUMN "currentTaskId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_e970f09040e68e046173e6a133d" FOREIGN KEY ("currentTaskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
