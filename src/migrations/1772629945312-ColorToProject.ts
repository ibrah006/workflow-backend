import { MigrationInterface, QueryRunner } from "typeorm";

export class ColorToProject1772629945312 implements MigrationInterface {
    name = 'ColorToProject1772629945312'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" ADD "color" character varying(7)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "color"`);
    }

}
