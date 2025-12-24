import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBarcodeToMaterials1762700525903 implements MigrationInterface {
    name = 'AddBarcodeToMaterials1762700525903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add the column
        await queryRunner.query(`
            ALTER TABLE "materials"
            ADD COLUMN "barcode" TEXT;
        `);

        // 2. Populate existing rows (oldest first)
        await queryRunner.query(`
            WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
            FROM "materials"
            )
            UPDATE "materials" AS m
            SET "barcode" = CONCAT('MAT-', r.rn)
            FROM ranked AS r
            WHERE m.id = r.id
            AND m."barcode" IS NULL;
        `);

        // 3. Create trigger function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION set_material_barcode()
            RETURNS TRIGGER AS $$
            BEGIN
            IF NEW."barcode" IS NULL THEN
                NEW."barcode" := CONCAT('MAT-', NEW.materialNumber);
            END IF;
            RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 4. Create trigger
        await queryRunner.query(`
            CREATE TRIGGER trg_set_material_barcode
            BEFORE INSERT ON "materials"
            FOR EACH ROW
            EXECUTE FUNCTION set_material_barcode();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the changes

        // 1. Drop the trigger
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS trg_set_material_barcode ON "materials";
        `);

        // 2. Drop the function
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS set_material_barcode();
        `);

        // 3. Drop the column
        await queryRunner.query(`
            ALTER TABLE "materials" DROP COLUMN "barcode";
        `);
    }

}
