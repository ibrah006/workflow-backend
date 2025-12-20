import { MigrationInterface, QueryRunner } from "typeorm";

export class NEW1766231997933 implements MigrationInterface {
    name = 'NEW1766231997933'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_acb5a8e3dd41e653d2f2a9f0bf7"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_d09eec4e5b634034db8a875a6e2"`);
        await queryRunner.query(`ALTER TABLE "task" DROP COLUMN "printer"`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" ADD "department" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "UQ_7e10e5c16be44acf361df9f3cfb" UNIQUE ("barcode")`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_acb5a8e3dd41e653d2f2a9f0bf7" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_39b931116c60c61a1ffcb149a71" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_39b931116c60c61a1ffcb149a71"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_acb5a8e3dd41e653d2f2a9f0bf7"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "UQ_7e10e5c16be44acf361df9f3cfb"`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" DROP COLUMN "department"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "task" ADD "printer" uuid`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_d09eec4e5b634034db8a875a6e2" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" ADD CONSTRAINT "FK_acb5a8e3dd41e653d2f2a9f0bf7" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
