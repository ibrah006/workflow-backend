import { MigrationInterface, QueryRunner } from "typeorm";

export class StockTransactionAttribBarcodeNotUnique1766662480102 implements MigrationInterface {
    name = 'StockTransactionAttribBarcodeNotUnique1766662480102'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "UQ_7e10e5c16be44acf361df9f3cfb"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ALTER COLUMN "committed" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ALTER COLUMN "committed" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" ALTER COLUMN "committed" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ALTER COLUMN "committed" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "UQ_7e10e5c16be44acf361df9f3cfb" UNIQUE ("barcode")`);
    }

}
