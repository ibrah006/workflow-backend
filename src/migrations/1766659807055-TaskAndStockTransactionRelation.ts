import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskAndStockTransactionRelation1766659807055 implements MigrationInterface {
    name = 'TaskAndStockTransactionRelation1766659807055'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD "taskId" integer`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "UQ_c5aced24f4e1bfb6e5b5e948ada" UNIQUE ("taskId")`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD "committed" boolean DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "task" ADD "stockTransactionId" uuid`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "UQ_d73685ce96f844d73ec9fa243e9" UNIQUE ("stockTransactionId")`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_d73685ce96f844d73ec9fa243e9" FOREIGN KEY ("stockTransactionId") REFERENCES "stock_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // await queryRunner.query(`ALTER TABLE "stock_transactions" `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_d73685ce96f844d73ec9fa243e9"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "UQ_d73685ce96f844d73ec9fa243e9"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "stockTransactionId"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP COLUMN "committed"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "UQ_c5aced24f4e1bfb6e5b5e948ada"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP COLUMN "taskId"`);
    }

}
