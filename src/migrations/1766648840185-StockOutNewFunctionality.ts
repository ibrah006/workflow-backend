import { MigrationInterface, QueryRunner } from "typeorm";

export class StockOutNewFunctionality1766648840185 implements MigrationInterface {
    name = 'StockOutNewFunctionality1766648840185'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "materials" ADD "stockDemand" integer NOT NULL DEFAULT '0'`);

        // 1. Add column with default (temporarily nullable-safe)
        await queryRunner.query(`
            ALTER TABLE "task"
            ADD COLUMN "productionQuantity" numeric DEFAULT 1
        `);

        // 2. Ensure all existing rows are set to 1
        await queryRunner.query(`
            UPDATE "task"
            SET "productionQuantity" = 1
            WHERE "productionQuantity" IS NULL
        `);
    
        // 3. Enforce NOT NULL
        await queryRunner.query(`
            ALTER TABLE "task"
            ALTER COLUMN "productionQuantity" SET NOT NULL
        `);
    
        // 4. Remove default if you want explicit values only
        await queryRunner.query(`
            ALTER TABLE "task"
            ALTER COLUMN "productionQuantity" DROP DEFAULT
        `);

        await queryRunner.query(`ALTER TABLE "task" ADD "priority" integer NOT NULL DEFAULT '1'`);

        // await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "barcode"`);
        // await queryRunner.query(`ALTER TABLE "materials" ADD "barcode" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "barcode"`);
        // await queryRunner.query(`ALTER TABLE "materials" ADD "barcode" text`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "productionQuantity"`);
        await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "stockDemand"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "priority"`);
    }

}
