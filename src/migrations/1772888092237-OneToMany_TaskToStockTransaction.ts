import { MigrationInterface, QueryRunner } from "typeorm";

export class OneToManyTaskToStockTransaction1772888092237 implements MigrationInterface {
    name = 'OneToManyTaskToStockTransaction1772888092237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "UQ_c5aced24f4e1bfb6e5b5e948ada"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "UQ_c5aced24f4e1bfb6e5b5e948ada" UNIQUE ("taskId")`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_c5aced24f4e1bfb6e5b5e948ada" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
