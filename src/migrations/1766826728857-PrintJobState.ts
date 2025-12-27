import { MigrationInterface, QueryRunner } from "typeorm";

export class PrintJobState1766826728857 implements MigrationInterface {
    name = 'PrintJobState1766826728857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" ADD "actualProductionStartTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task" ADD "actualProductionEndTime" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_39b931116c60c61a1ffcb149a71"`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "printerId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_39b931116c60c61a1ffcb149a71" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_39b931116c60c61a1ffcb149a71"`);
        await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "printerId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_39b931116c60c61a1ffcb149a71" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "actualProductionEndTime"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "actualProductionStartTime"`);
    }

}
