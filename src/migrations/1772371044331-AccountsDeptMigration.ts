import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountsDeptMigration1772371044331 implements MigrationInterface {
    name = 'AccountsDeptMigration1772371044331'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoice_line_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceId" uuid NOT NULL, "description" text NOT NULL, "unit" character varying, "quantity" numeric(10,2) NOT NULL DEFAULT '1', "unitPrice" numeric(12,2) NOT NULL DEFAULT '0', "total" numeric(12,2) NOT NULL DEFAULT '0', "sortOrder" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_4e8ccaadaf5d0619db9d219b061" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNumber" character varying NOT NULL, "clientId" character varying NOT NULL, "clientName" character varying NOT NULL, "clientEmail" character varying, "clientAddress" text, "clientTrn" character varying, "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'draft', "issueDate" date NOT NULL, "dueDate" date NOT NULL, "subtotal" numeric(12,2) NOT NULL DEFAULT '0', "taxRate" numeric(5,2) NOT NULL DEFAULT '5', "taxAmount" numeric(12,2) NOT NULL DEFAULT '0', "discountAmount" numeric(12,2) NOT NULL DEFAULT '0', "totalAmount" numeric(12,2) NOT NULL DEFAULT '0', "amountPaid" numeric(12,2) NOT NULL DEFAULT '0', "amountDue" numeric(12,2) NOT NULL DEFAULT '0', "notes" text, "terms" text, "organizationId" uuid NOT NULL, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_method_enum" AS ENUM('bank_transfer', 'card', 'cash', 'cheque', 'other')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "receiptNumber" character varying NOT NULL, "invoiceId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "method" "public"."payments_method_enum" NOT NULL DEFAULT 'bank_transfer', "reference" character varying, "notes" text, "paidAt" date NOT NULL, "recordedById" uuid, "createdAt1" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ccf1990399854743306e7ab8523" UNIQUE ("receiptNumber"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "invoice_line_items" ADD CONSTRAINT "FK_2ec8b1cda36ed79a7ded49bd913" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_4237f4b816fec1df81bd85f833f" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_dc9c84f58ab53b5c844c276e435" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_6fd182b885ee75c7e0ba258062e" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_6fd182b885ee75c7e0ba258062e"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_dc9c84f58ab53b5c844c276e435"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_4237f4b816fec1df81bd85f833f"`);
        await queryRunner.query(`ALTER TABLE "invoice_line_items" DROP CONSTRAINT "FK_2ec8b1cda36ed79a7ded49bd913"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`DROP TABLE "invoice_line_items"`);
    }

}
