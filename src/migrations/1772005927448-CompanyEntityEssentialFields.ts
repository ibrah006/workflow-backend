import { MigrationInterface, QueryRunner } from "typeorm";

export class Updates1772005927448 implements MigrationInterface {
    name = 'Updates1772005927448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "industry" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "company" ADD "contactName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "contactName"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "industry"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "email"`);
    }

}
