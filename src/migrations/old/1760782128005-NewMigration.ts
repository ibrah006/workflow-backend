import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMigration1760782128005 implements MigrationInterface {
    name = 'NewMigration1760782128005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wastage_log" ("id" SERIAL NOT NULL, "invoiceItemId" character varying NOT NULL, "wastage" numeric NOT NULL, "taskId" integer, CONSTRAINT "PK_89e6f56f3780ecf7acecd5d4ffd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "message" ("id" SERIAL NOT NULL, "message" character varying NOT NULL, "date" date NOT NULL, "userId" uuid, "taskId" integer, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "progress_log" ("id" uuid NOT NULL, "status" character varying NOT NULL, "isCompleted" boolean NOT NULL DEFAULT false, "description" character varying, "issue" character varying, "dueDate" date, "startDate" date NOT NULL DEFAULT ('now'::text)::date, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completedAt" TIMESTAMP WITH TIME ZONE, "projectId" character varying, CONSTRAINT "PK_59ba81d77fc262fe624293fbaf2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "task" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "dueDate" TIMESTAMP, "assigneesLastAdded" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'pending', "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workActivityLogsLastModifiedAt" TIMESTAMP WITH TIME ZONE, "dateCompleted" date, "projectId" character varying, "progressLogId" uuid NOT NULL, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "company" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "createdById" uuid NOT NULL, CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."material_log_type_enum" AS ENUM('IN', 'OUT', 'ESTIMATE')`);
        await queryRunner.query(`CREATE TABLE "material_log" ("id" SERIAL NOT NULL, "description" character varying NOT NULL, "quantity" integer NOT NULL, "width" numeric NOT NULL, "height" numeric NOT NULL, "dateCreated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" "public"."material_log_type_enum" NOT NULL, "loggedById" uuid, "projectId" character varying, CONSTRAINT "PK_b7b40a603aa5403ce04c2643aa2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project" ("id" character varying NOT NULL, "organizationId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" character varying, "status" character varying NOT NULL, "dateStarted" date DEFAULT now(), "dueDate" date, "estimatedProductionStart" date, "estimatedSiteFixing" date, "priority" integer NOT NULL DEFAULT '0', "progressLogLastModifiedAt" TIMESTAMP WITH TIME ZONE, "tasksLastModifiedAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "clientId" uuid, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "organization" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c21e615583a3ebbb0977452afb0" UNIQUE ("name"), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "createdById" uuid, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attendance_log" ("id" SERIAL NOT NULL, "checkIn" TIMESTAMP NOT NULL, "checkOut" TIMESTAMP, "userId" uuid, CONSTRAINT "PK_c5f15a2267f6b4a7174001ea912" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "layoff_log" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP, "userId" uuid, CONSTRAINT "PK_ca16eca8fcf76bf912aab867cad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'viewer', "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "skills" text array NOT NULL DEFAULT '{}', "efficiencyScore" numeric NOT NULL DEFAULT '0', "duration" integer NOT NULL DEFAULT '0', "departmentId" integer, "organizationId" uuid, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "work_activity_log" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid, "taskId" integer, CONSTRAINT "PK_e1f13a1dd67ba9634126ee12684" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "task_assignees_user" ("taskId" integer NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_910c37c13f72414640db814dc60" PRIMARY KEY ("taskId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6779281224d4075bfd0c18fdc2" ON "task_assignees_user" ("taskId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d3ab8572b56640902c3f40fcaa" ON "task_assignees_user" ("userId") `);
        await queryRunner.query(`CREATE TABLE "project_assigned_managers_user" ("projectId" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_9b9939fb151e0e4616bf478db0b" PRIMARY KEY ("projectId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d9fd4807ea74dadce7f705af6f" ON "project_assigned_managers_user" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_43a779234ed899161f17f93613" ON "project_assigned_managers_user" ("userId") `);
        await queryRunner.query(`ALTER TABLE "wastage_log" ADD CONSTRAINT "FK_aab33ce2671eb208442c68b67a5" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_446251f8ceb2132af01b68eb593" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_d4f63b9a33826eb052fd934b070" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_39728fe700699caa76a2a9c5f20" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_11c1f96bc242b84517d279d471c" FOREIGN KEY ("progressLogId") REFERENCES "progress_log"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company" ADD CONSTRAINT "FK_865ba8d77c1cb1478bf7e59c750" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company" ADD CONSTRAINT "FK_306bbc7f81f2a0fa162f7261417" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_log" ADD CONSTRAINT "FK_48584b111e24870036acd7f7aac" FOREIGN KEY ("loggedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_log" ADD CONSTRAINT "FK_a46c90c15933b395321ef2b70da" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_0028dfadf312a1d7f51656c4a9a" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66" FOREIGN KEY ("clientId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization" ADD CONSTRAINT "FK_acdbd1e490930af04b4ff569ca9" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team" ADD CONSTRAINT "FK_3a93fbdeba4e1e9e47fec6bada9" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team" ADD CONSTRAINT "FK_12e10686074dba7e8fd02f41bf4" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_log" ADD CONSTRAINT "FK_e22012e930d96307906528f1bd5" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "layoff_log" ADD CONSTRAINT "FK_c1d9823779465cb2c90054684a7" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_3d6915a33798152a079997cad28" FOREIGN KEY ("departmentId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_dfda472c0af7812401e592b6a61" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" ADD CONSTRAINT "FK_80b9149aafae9cd1cd1e8d9564f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" ADD CONSTRAINT "FK_6e575bb05b464e33f68faf49140" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_assignees_user" ADD CONSTRAINT "FK_6779281224d4075bfd0c18fdc2c" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_assignees_user" ADD CONSTRAINT "FK_d3ab8572b56640902c3f40fcaa2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_assigned_managers_user" ADD CONSTRAINT "FK_d9fd4807ea74dadce7f705af6f6" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_assigned_managers_user" ADD CONSTRAINT "FK_43a779234ed899161f17f936133" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_assigned_managers_user" DROP CONSTRAINT "FK_43a779234ed899161f17f936133"`);
        await queryRunner.query(`ALTER TABLE "project_assigned_managers_user" DROP CONSTRAINT "FK_d9fd4807ea74dadce7f705af6f6"`);
        await queryRunner.query(`ALTER TABLE "task_assignees_user" DROP CONSTRAINT "FK_d3ab8572b56640902c3f40fcaa2"`);
        await queryRunner.query(`ALTER TABLE "task_assignees_user" DROP CONSTRAINT "FK_6779281224d4075bfd0c18fdc2c"`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" DROP CONSTRAINT "FK_6e575bb05b464e33f68faf49140"`);
        await queryRunner.query(`ALTER TABLE "work_activity_log" DROP CONSTRAINT "FK_80b9149aafae9cd1cd1e8d9564f"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_dfda472c0af7812401e592b6a61"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_3d6915a33798152a079997cad28"`);
        await queryRunner.query(`ALTER TABLE "layoff_log" DROP CONSTRAINT "FK_c1d9823779465cb2c90054684a7"`);
        await queryRunner.query(`ALTER TABLE "attendance_log" DROP CONSTRAINT "FK_e22012e930d96307906528f1bd5"`);
        await queryRunner.query(`ALTER TABLE "team" DROP CONSTRAINT "FK_12e10686074dba7e8fd02f41bf4"`);
        await queryRunner.query(`ALTER TABLE "team" DROP CONSTRAINT "FK_3a93fbdeba4e1e9e47fec6bada9"`);
        await queryRunner.query(`ALTER TABLE "organization" DROP CONSTRAINT "FK_acdbd1e490930af04b4ff569ca9"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_816f608a9acf4a4314c9e1e9c66"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_0028dfadf312a1d7f51656c4a9a"`);
        await queryRunner.query(`ALTER TABLE "material_log" DROP CONSTRAINT "FK_a46c90c15933b395321ef2b70da"`);
        await queryRunner.query(`ALTER TABLE "material_log" DROP CONSTRAINT "FK_48584b111e24870036acd7f7aac"`);
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_306bbc7f81f2a0fa162f7261417"`);
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_865ba8d77c1cb1478bf7e59c750"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_11c1f96bc242b84517d279d471c"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_39728fe700699caa76a2a9c5f20"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_d4f63b9a33826eb052fd934b070"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_446251f8ceb2132af01b68eb593"`);
        await queryRunner.query(`ALTER TABLE "wastage_log" DROP CONSTRAINT "FK_aab33ce2671eb208442c68b67a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43a779234ed899161f17f93613"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9fd4807ea74dadce7f705af6f"`);
        await queryRunner.query(`DROP TABLE "project_assigned_managers_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d3ab8572b56640902c3f40fcaa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6779281224d4075bfd0c18fdc2"`);
        await queryRunner.query(`DROP TABLE "task_assignees_user"`);
        await queryRunner.query(`DROP TABLE "work_activity_log"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "layoff_log"`);
        await queryRunner.query(`DROP TABLE "attendance_log"`);
        await queryRunner.query(`DROP TABLE "team"`);
        await queryRunner.query(`DROP TABLE "organization"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TABLE "material_log"`);
        await queryRunner.query(`DROP TYPE "public"."material_log_type_enum"`);
        await queryRunner.query(`DROP TABLE "company"`);
        await queryRunner.query(`DROP TABLE "task"`);
        await queryRunner.query(`DROP TABLE "progress_log"`);
        await queryRunner.query(`DROP TABLE "message"`);
        await queryRunner.query(`DROP TABLE "wastage_log"`);
    }
}
