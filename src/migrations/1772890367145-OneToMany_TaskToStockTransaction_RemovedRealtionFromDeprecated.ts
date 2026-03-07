import { MigrationInterface, QueryRunner } from "typeorm";

export class OneToManyTaskToStockTransactionRemovedRealtionFromDeprecated1772890367145 implements MigrationInterface {
    name = 'OneToManyTaskToStockTransactionRemovedRealtionFromDeprecated1772890367145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada"`);
        // await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "UQ_c5aced24f4e1bfb6e5b5e948ada"`);
        // await queryRunner.query(`ALTER TABLE "materials" ADD CONSTRAINT "UQ_2db6bdffd012639fa0ca2ab1616" UNIQUE ("organizationId", "name")`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada"`);
        // await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "UQ_2db6bdffd012639fa0ca2ab1616"`);
        // await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "UQ_c5aced24f4e1bfb6e5b5e948ada" UNIQUE ("taskId")`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
