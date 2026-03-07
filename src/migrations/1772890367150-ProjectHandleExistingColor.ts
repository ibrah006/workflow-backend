// Custom created Migration

import { MigrationInterface, QueryRunner } from "typeorm";

export class ProjectHandleExistingColor1772890367150 implements MigrationInterface {
    name = 'ProjectHandleExistingColor1772890367150'

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        UPDATE "project"
        SET "color" = (
          (ARRAY[
            '#2563EB',
            '#8B5CF6',
            '#10B981',
            '#F59E0B'
          ])[floor(random() * 4 + 1)]
        )
        WHERE "color" IS NULL
      `);
    }
  
    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        UPDATE "project"
        SET "color" = NULL
      `);
    }

}
