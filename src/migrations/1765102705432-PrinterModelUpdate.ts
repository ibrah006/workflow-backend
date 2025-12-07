import { MigrationInterface, QueryRunner } from "typeorm";

export class PrinterModelUpdate1765102705432 implements MigrationInterface {
    name = 'PrinterModelUpdate1765102705432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_16b2672176b03825c6d46b1cbc3"`);
        await queryRunner.query(`ALTER TABLE "printers" ALTER COLUMN "organizationId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_16b2672176b03825c6d46b1cbc3" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_16b2672176b03825c6d46b1cbc3"`);
        await queryRunner.query(`ALTER TABLE "printers" ALTER COLUMN "organizationId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_16b2672176b03825c6d46b1cbc3" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
