import { MigrationInterface, QueryRunner } from "typeorm";

export class MaterialNameUniquePerOrg1762703519775 implements MigrationInterface {
    name = 'MaterialNameUniquePerOrg1762703519775'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE EXTENSION IF NOT EXISTS citext;
        `);
    
        await queryRunner.query(`
          ALTER TABLE materials
          ALTER COLUMN name TYPE citext;
        `);
    
        await queryRunner.query(`
          ALTER TABLE materials
          ADD CONSTRAINT materials_org_name_unique UNIQUE ("organizationId", "name");
        `);
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE materials DROP CONSTRAINT materials_org_name_unique;
        `);
    
        await queryRunner.query(`
          ALTER TABLE materials
          ALTER COLUMN name TYPE VARCHAR;
        `);
    }
}
