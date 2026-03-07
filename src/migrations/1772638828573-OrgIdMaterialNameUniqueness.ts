import { MigrationInterface, QueryRunner } from "typeorm";

export class OrgIdMaterialNameUniqueness1772638828573 implements MigrationInterface {
    name = 'OrgIdMaterialNameUniqueness1772638828573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "barcode"`);
        // await queryRunner.query(`ALTER TABLE "materials" ADD "barcode" character varying NOT NULL`);
        await queryRunner.query(`
            ALTER TABLE "materials"
            ALTER COLUMN "barcode" TYPE character varying
        `);
        await queryRunner.query(`ALTER TABLE "materials" ADD CONSTRAINT "UQ_2db6bdffd012639fa0ca2ab1616" UNIQUE ("organizationId", "name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "UQ_2db6bdffd012639fa0ca2ab1616"`);
        // await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "barcode"`);
        // await queryRunner.query(`ALTER TABLE "materials" ADD "barcode" text`);
        await queryRunner.query(`
            ALTER TABLE "materials"
            ALTER COLUMN "barcode" SET NOT NULL
        `);
    }

}
