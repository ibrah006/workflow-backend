import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskAttributeDepartment1765439495798 implements MigrationInterface {
    name = 'TaskAttributeDepartment1765439495798'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "department" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "department"`);
    }

}
