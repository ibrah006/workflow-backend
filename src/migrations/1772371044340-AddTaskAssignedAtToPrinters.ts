// NOT GENERATED MIGRATION
// MANUALLY WRITTEN MIGRATION

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskAssignedAtToPrinters1700000000000 implements MigrationInterface {
  name = "AddTaskAssignedAtToPrinters1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "printers"
      ADD COLUMN IF NOT EXISTS "taskAssignedAt" timestamptz NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "printers"
      DROP COLUMN IF EXISTS "taskAssignedAt";
    `);
  }
}