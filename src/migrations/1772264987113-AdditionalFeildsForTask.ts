import { MigrationInterface, QueryRunner } from "typeorm";

export class AdditionalFeildsForTask1772264987113 implements MigrationInterface {
    name = 'AdditionalFeildsForTask1772264987113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "ref" character varying`);
        await queryRunner.query(`ALTER TABLE "task" ADD "size" character varying`);
        await queryRunner.query(`ALTER TABLE "task" ADD "quantity" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "size"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "ref"`);
    }

}
