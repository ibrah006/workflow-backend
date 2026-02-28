import { MigrationInterface, QueryRunner } from "typeorm";

export class BillingStatusFieldTask1772283629375 implements MigrationInterface {
    name = 'BillingStatusFieldTask1772283629375'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "billingStatus" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "billingStatus"`);
    }

}
