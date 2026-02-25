import { MigrationInterface, QueryRunner } from "typeorm";

export class CompanyEntityColorField1772006043593 implements MigrationInterface {
    name = 'CompanyEntityColorField1772006043593'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "industry" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "contactName" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "color" character varying(7)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "color"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "contactName"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "industry"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "email"`);
    }

}
