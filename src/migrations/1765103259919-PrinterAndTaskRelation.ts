import { MigrationInterface, QueryRunner } from "typeorm";

export class PrinterAndTaskRelation1765103259919 implements MigrationInterface {
    name = 'PrinterAndTaskRelation1765103259919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" ADD "currentTaskId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD "printerId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD "printer" uuid`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_e970f09040e68e046173e6a133d" FOREIGN KEY ("currentTaskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_d09eec4e5b634034db8a875a6e2" FOREIGN KEY ("printer") REFERENCES "printers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_d09eec4e5b634034db8a875a6e2"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_e970f09040e68e046173e6a133d"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "printer"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "printerId"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP COLUMN "currentTaskId"`);
    }

}
