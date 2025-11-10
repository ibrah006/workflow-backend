import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBarcodeToMaterialsUpdatedTrigger1762748169518 implements MigrationInterface {
    name = 'AddBarcodeToMaterialsUpdatedTrigger1762748169518'

    public async up(queryRunner: QueryRunner): Promise<void> {

        // 1. Add materialNumber column
        await queryRunner.query(`
          ALTER TABLE materials
          ADD COLUMN IF NOT EXISTS "materialNumber" INT;
        `);
    
        // 2. Create trigger function
        await queryRunner.query(`
          CREATE OR REPLACE FUNCTION set_material_barcode_and_number()
          RETURNS TRIGGER AS $$
          DECLARE
            nextNumber INT;
          BEGIN
            -- Assign next incremental materialNumber within organization
            IF NEW."materialNumber" IS NULL THEN
              SELECT COALESCE(MAX("materialNumber"), 0) + 1
              INTO nextNumber
              FROM materials
              WHERE "organizationId" = NEW."organizationId";
    
              NEW."materialNumber" := nextNumber;
            END IF;
    
            -- Generate barcode as MAT-{materialNumber}
            IF NEW."barcode" IS NULL THEN
              NEW."barcode" := CONCAT('MAT-', NEW."materialNumber");
            END IF;
    
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);
    
        // 3. Create trigger
        await queryRunner.query(`
          DROP TRIGGER IF EXISTS set_material_barcode_trigger ON materials;
    
          CREATE TRIGGER set_material_barcode_trigger
          BEFORE INSERT ON materials
          FOR EACH ROW
          EXECUTE FUNCTION set_material_barcode_and_number();
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        // rollback trigger + function + column
        await queryRunner.query(`
          DROP TRIGGER IF EXISTS set_material_barcode_trigger ON materials;
        `);
    
        await queryRunner.query(`
          DROP FUNCTION IF EXISTS set_material_barcode_and_number();
        `);
    
        await queryRunner.query(`
          ALTER TABLE materials
          DROP COLUMN IF EXISTS "materialNumber";
        `);
      }

}
