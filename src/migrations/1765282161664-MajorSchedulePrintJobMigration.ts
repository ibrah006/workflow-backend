import { MigrationInterface, QueryRunner } from "typeorm";
import { addForeignKeyIfNotExists } from "./functions/add_foreign_keys_ifnotexists";

export class MajorSchedulePrintJobMigration1765282161664 implements MigrationInterface {
    name = 'MajorSchedulePrintJobMigration1765282161664'

    private async createEnumIfNotExists(
      queryRunner: QueryRunner,
      enumName: string,
      values: string[]
    ) {
    await queryRunner.query(`
        DO $$
        BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = '${enumName}'
        ) THEN
            CREATE TYPE "${enumName}" AS ENUM (${values.map(v => `'${v}'`).join(', ')});
        END IF;
        END
        $$;
    `);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "wastage_log" ("id" SERIAL NOT NULL, "invoiceItemId" character varying NOT NULL, "wastage" numeric NOT NULL, "taskId" integer, CONSTRAINT "PK_89e6f56f3780ecf7acecd5d4ffd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "message" ("id" SERIAL NOT NULL, "message" character varying NOT NULL, "date" date NOT NULL, "userId" uuid, "taskId" integer, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "progress_log" ("id" uuid NOT NULL, "status" character varying NOT NULL, "isCompleted" boolean NOT NULL DEFAULT false, "description" character varying, "issue" character varying, "dueDate" date, "startDate" date NOT NULL DEFAULT ('now'::text)::date, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completedAt" TIMESTAMP WITH TIME ZONE, "projectId" character varying, "taskId" integer NOT NULL, CONSTRAINT "PK_59ba81d77fc262fe624293fbaf2" PRIMARY KEY ("id"))`);
        await this.createEnumIfNotExists(queryRunner, 'printers_status_enum', ['active', 'paused', 'maintenance', 'offline'])
        // await queryRunner.query(`CREATE TYPE IF NOT EXISTS "public"."printers_status_enum" AS ENUM('active', 'paused', 'maintenance', 'offline')`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "printers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "nickname" character varying NOT NULL, "location" character varying, "status" "public"."printers_status_enum" NOT NULL DEFAULT 'active', "maxWidth" numeric(10,2), "printSpeed" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "currentTaskId" integer, CONSTRAINT "PK_036bb976f205339f632e2eb0642" PRIMARY KEY ("id"))`);
        await this.createEnumIfNotExists(queryRunner, 'stock_transactions_type_enum', ['stock_in', 'stock_out', 'adjustment'])
        // await queryRunner.query(`CREATE TYPE IF NOT EXISTS "public"."stock_transactions_type_enum" AS ENUM('stock_in', 'stock_out', 'adjustment')`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "stock_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "materialId" uuid NOT NULL, "type" "public"."stock_transactions_type_enum" NOT NULL, "quantity" numeric(10,2) NOT NULL, "balanceAfter" numeric(10,2) NOT NULL, "barcode" character varying, "notes" text, "projectId" character varying, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7e10e5c16be44acf361df9f3cfb" UNIQUE ("barcode"), CONSTRAINT "PK_1aa2430f5ac950c26da6e1ff222" PRIMARY KEY ("id"))`);
        await this.createEnumIfNotExists(queryRunner, 'materials_measuretype_enum', ['running_meter', 'item_quantity', 'liters', 'kilograms', 'square_meter'])
        // await queryRunner.query(`CREATE TYPE IF NOT EXISTS "public"."materials_measuretype_enum" AS ENUM('running_meter', 'item_quantity', 'liters', 'kilograms', 'square_meter')`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "materials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "materialNumber" integer, "name" character varying NOT NULL, "description" text, "measureType" "public"."materials_measuretype_enum" NOT NULL, "currentStock" numeric(10,2) NOT NULL DEFAULT '0', "minStockLevel" numeric(10,2) NOT NULL DEFAULT '0', "organizationId" uuid NOT NULL, "createdById" uuid NOT NULL, "barcode" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2fd1a93ecb222a28bef28663fa0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "task" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "dueDate" TIMESTAMP, "assigneesLastAdded" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'pending', "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "workActivityLogsLastModifiedAt" TIMESTAMP WITH TIME ZONE, "dateCompleted" date, "printerId" uuid NOT NULL, "runs" integer NOT NULL DEFAULT '1', "productionDuration" integer, "materialId" uuid NOT NULL, "projectId" character varying, "printer" uuid, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "company" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "createdById" uuid NOT NULL, CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`);
        await this.createEnumIfNotExists(queryRunner, 'material_log_type_enum', ['IN', 'OUT', 'ESTIMATE'])
        // await queryRunner.query(`CREATE TYPE IF NOT EXISTS "public"."material_log_type_enum" AS ENUM('IN', 'OUT', 'ESTIMATE')`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "material_log" ("id" SERIAL NOT NULL, "description" character varying NOT NULL, "quantity" integer NOT NULL, "width" numeric NOT NULL, "height" numeric NOT NULL, "dateCreated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" "public"."material_log_type_enum" NOT NULL, "loggedById" uuid, "projectId" character varying, CONSTRAINT "PK_b7b40a603aa5403ce04c2643aa2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "project" ("id" character varying NOT NULL, "organizationId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" character varying, "status" character varying NOT NULL, "dateStarted" date DEFAULT now(), "dueDate" date, "estimatedProductionStart" date, "estimatedSiteFixing" date, "priority" integer NOT NULL DEFAULT '0', "progressLogLastModifiedAt" TIMESTAMP WITH TIME ZONE, "tasksLastModifiedAt" TIMESTAMP WITH TIME ZONE, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "clientId" uuid, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "organization" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "createdById" uuid NOT NULL, "isSample" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "projectsLastAdded" TIMESTAMP WITH TIME ZONE, "isDomainOwner" boolean NOT NULL DEFAULT false, "privateDomain" character varying, CONSTRAINT "UQ_c21e615583a3ebbb0977452afb0" UNIQUE ("name"), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "team" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid NOT NULL, "createdById" uuid, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "attendance_log" ("id" SERIAL NOT NULL, "checkIn" TIMESTAMP NOT NULL, "checkOut" TIMESTAMP, "userId" uuid, CONSTRAINT "PK_c5f15a2267f6b4a7174001ea912" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "layoff_log" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP, "userId" uuid, CONSTRAINT "PK_ca16eca8fcf76bf912aab867cad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'viewer', "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "skills" text array NOT NULL DEFAULT '{}', "efficiencyScore" numeric NOT NULL DEFAULT '0', "duration" integer NOT NULL DEFAULT '0', "departmentId" integer, "organizationId" uuid, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "work_activity_log" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP, "department" character varying NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid, "taskId" integer, CONSTRAINT "PK_e1f13a1dd67ba9634126ee12684" PRIMARY KEY ("id"))`);
        await this.createEnumIfNotExists(queryRunner, 'invitations_status_enum', ['pending', 'accepted', 'cancelled', 'expired'])
        // await queryRunner.query(`CREATE TYPE IF NOT EXISTS "public"."invitations_status_enum" AS ENUM('pending', 'accepted', 'cancelled', 'expired')`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'pending', "token" uuid NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "organizationId" uuid NOT NULL, "role" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "invitedById" uuid, CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_97ab59cb592c7cec109741b592" ON "invitations" ("email") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e577dcf9bb6d084373ed399850" ON "invitations" ("token") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b9139f00cebfadced76bca3084" ON "invitations" ("organizationId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_2eac15d72bc9f55fe39cd87d9d" ON "invitations" ("email", "organizationId", "status") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "task_assignees_user" ("taskId" integer NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_910c37c13f72414640db814dc60" PRIMARY KEY ("taskId", "userId"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6779281224d4075bfd0c18fdc2" ON "task_assignees_user" ("taskId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d3ab8572b56640902c3f40fcaa" ON "task_assignees_user" ("userId") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "project_assigned_managers_user" ("projectId" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_9b9939fb151e0e4616bf478db0b" PRIMARY KEY ("projectId", "userId"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d9fd4807ea74dadce7f705af6f" ON "project_assigned_managers_user" ("projectId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_43a779234ed899161f17f93613" ON "project_assigned_managers_user" ("userId") `);
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'FK_aab33ce2671eb208442c68b67a5'
              ) THEN
                ALTER TABLE "wastage_log"
                ADD CONSTRAINT "FK_aab33ce2671eb208442c68b67a5"
                FOREIGN KEY ("taskId")
                REFERENCES "task"("id")
                ON DELETE SET NULL
                ON UPDATE NO ACTION;
              END IF;
            END
            $$;
            `);
            await queryRunner.query(`DO $$
              BEGIN
              IF NOT EXISTS (
                  SELECT 1
                  FROM pg_constraint
                  WHERE conname = 'FK_446251f8ceb2132af01b68eb593'
              ) THEN
                  ALTER TABLE "message"
                  ADD CONSTRAINT "FK_446251f8ceb2132af01b68eb593"
                  FOREIGN KEY ("userId")
                  REFERENCES "user"("id")
                  ON DELETE NO ACTION
                  ON UPDATE NO ACTION;
              END IF;
              END
              $$;
              `);
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'FK_d4f63b9a33826eb052fd934b070'
            ) THEN
              ALTER TABLE "message"
              ADD CONSTRAINT "FK_d4f63b9a33826eb052fd934b070"
              FOREIGN KEY ("taskId")
              REFERENCES "task"("id")
              ON DELETE CASCADE
              ON UPDATE NO ACTION;
            END IF;
          END
          $$;
          `);                
        await addForeignKeyIfNotExists(
          queryRunner,
          {
              table: 'progress_log',
              constraintName: 'FK_39728fe700699caa76a2a9c5f20',
              column: 'projectId',
              referencedTable: 'project',
              referencedColumn: 'id',
              onDelete: 'NO ACTION',
              onUpdate: 'NO ACTION',
          }
        );
        // await queryRunner.query(`ALTER TABLE "progress_log" ADD CONSTRAINT "FK_21983d9c4d3691a6cc6edafa411" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_16b2672176b03825c6d46b1cbc3" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "printers" ADD CONSTRAINT "FK_e970f09040e68e046173e6a133d" FOREIGN KEY ("currentTaskId") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'stock_transactions',
          constraintName: 'FK_402fae16a3b7b44f7628c3e203a',
          column: 'materialId',
          referencedTable: 'materials',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'stock_transactions',
          constraintName: 'FK_3965d676cb2f12c1b86f297599b',
          column: 'projectId',
          referencedTable: 'project',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'stock_transactions',
          constraintName: 'FK_acb5a8e3dd41e653d2f2a9f0bf7',
          column: 'createdById',
          referencedTable: 'user',
          referencedColumn: 'id',
          onDelete: 'SET NULL',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'materials',
          constraintName: 'FK_b641bd9a8e615030a93f853a935',
          column: 'organizationId',
          referencedTable: 'organization',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'materials',
          constraintName: 'FK_5f86dcbd0cddd6a5e3f9ff3d36e',
          column: 'createdById',
          referencedTable: 'user',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'task',
          constraintName: 'FK_3797a20ef5553ae87af126bc2fe',
          column: 'projectId',
          referencedTable: 'project',
          referencedColumn: 'id',
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        });
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_d09eec4e5b634034db8a875a6e2" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_388081a3e1332355fc4d95fba62" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'company',
          constraintName: 'FK_865ba8d77c1cb1478bf7e59c750',
          column: 'createdById',
          referencedTable: 'user',
          referencedColumn: 'id',
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'company',
          constraintName: 'FK_306bbc7f81f2a0fa162f7261417',
          column: 'organizationId',
          referencedTable: 'organization',
          referencedColumn: 'id',
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'material_log',
          constraintName: 'FK_48584b111e24870036acd7f7aac',
          column: 'loggedById',
          referencedTable: 'user',
          referencedColumn: 'id'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'material_log',
          constraintName: 'FK_48584b111e24870036acd7f7aac',
          column: 'loggedById',
          referencedTable: 'user',
          referencedColumn: 'id'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'material_log',
          constraintName: 'FK_a46c90c15933b395321ef2b70da',
          column: 'projectId',
          referencedTable: 'project',
          referencedColumn: 'id'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'project',
          constraintName: 'FK_0028dfadf312a1d7f51656c4a9a',
          column: 'organizationId',
          referencedTable: 'organization',
          referencedColumn: 'id',
          onDelete: 'CASCADE',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'project',
          constraintName: 'FK_816f608a9acf4a4314c9e1e9c66',
          column: 'clientId',
          referencedTable: 'company',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'organization',
          constraintName: 'FK_acdbd1e490930af04b4ff569ca9',
          column: 'createdById',
          referencedTable: 'user',
          referencedColumn: 'id',
          onDelete: 'RESTRICT',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'team',
          constraintName: 'FK_3a93fbdeba4e1e9e47fec6bada9',
          column: 'createdById',
          referencedTable: 'user',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'team',
          constraintName: 'FK_12e10686074dba7e8fd02f41bf4',
          column: 'organizationId',
          referencedTable: 'organization',
          referencedColumn: 'id',
          onDelete: 'CASCADE',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'attendance_log',
          constraintName: 'FK_e22012e930d96307906528f1bd5',
          column: 'userId',
          referencedTable: 'user',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'layoff_log',
          constraintName: 'FK_c1d9823779465cb2c90054684a7',
          column: 'userId',
          referencedTable: 'user',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'user',
          constraintName: 'FK_3d6915a33798152a079997cad28',
          column: 'departmentId',
          referencedTable: 'team',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'user',
          constraintName: 'FK_dfda472c0af7812401e592b6a61',
          column: 'organizationId',
          referencedTable: 'organization',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'work_activity_log',
          constraintName: 'FK_80b9149aafae9cd1cd1e8d9564f',
          column: 'userId',
          referencedTable: 'user',
          referencedColumn: 'id',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'work_activity_log',
          constraintName: 'FK_6e575bb05b464e33f68faf49140',
          column: 'taskId',
          referencedTable: 'task',
          referencedColumn: 'id',
          onDelete: 'SET NULL'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'invitations',
          constraintName: 'FK_b9139f00cebfadced76bca3084f',
          column: 'organizationId',
          referencedTable: 'organization',
          referencedColumn: 'id',
          onDelete: 'CASCADE',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'invitations',
          constraintName: 'FK_b60325e5302be0dad38b423314c',
          column: 'invitedById',
          referencedTable: 'user',
          referencedColumn: 'id',
          onDelete: 'SET NULL',
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'task_assignees_user',
          constraintName: 'FK_6779281224d4075bfd0c18fdc2c',
          column: 'taskId',
          referencedTable: 'task',
          referencedColumn: 'id',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'task_assignees_user',
          constraintName: 'FK_d3ab8572b56640902c3f40fcaa2',
          column: 'userId',
          referencedTable: 'user',
          referencedColumn: 'id'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'project_assigned_managers_user',
          constraintName: 'FK_d9fd4807ea74dadce7f705af6f6',
          column: 'projectId',
          referencedTable: 'project',
          referencedColumn: 'id',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        });
        await addForeignKeyIfNotExists(queryRunner, {
          table: 'project_assigned_managers_user',
          constraintName: 'FK_43a779234ed899161f17f936133',
          column: 'userId',
          referencedTable: 'user',
          referencedColumn: 'id'
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_assigned_managers_user" DROP CONSTRAINT "FK_43a779234ed899161f17f936133"`);
        await queryRunner.query(`ALTER TABLE "project_assigned_managers_user" DROP CONSTRAINT "FK_d9fd4807ea74dadce7f705af6f6"`);
        await queryRunner.query(`ALTER TABLE "task_assignees_user" DROP CONSTRAINT "FK_d3ab8572b56640902c3f40fcaa2"`);
        await queryRunner.query(`ALTER TABLE "task_assignees_user" DROP CONSTRAINT "FK_6779281224d4075bfd0c18fdc2c"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_b60325e5302be0dad38b423314c"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_b9139f00cebfadced76bca3084f"`);
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
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_388081a3e1332355fc4d95fba62"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_d09eec4e5b634034db8a875a6e2"`);
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe"`);
        await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "FK_5f86dcbd0cddd6a5e3f9ff3d36e"`);
        await queryRunner.query(`ALTER TABLE "materials" DROP CONSTRAINT "FK_b641bd9a8e615030a93f853a935"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_acb5a8e3dd41e653d2f2a9f0bf7"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_3965d676cb2f12c1b86f297599b"`);
        await queryRunner.query(`ALTER TABLE "stock_transactions" DROP CONSTRAINT "FK_402fae16a3b7b44f7628c3e203a"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_e970f09040e68e046173e6a133d"`);
        await queryRunner.query(`ALTER TABLE "printers" DROP CONSTRAINT "FK_16b2672176b03825c6d46b1cbc3"`);
        await queryRunner.query(`ALTER TABLE "progress_log" DROP CONSTRAINT "FK_21983d9c4d3691a6cc6edafa411"`);
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
        await queryRunner.query(`DROP INDEX "public"."IDX_2eac15d72bc9f55fe39cd87d9d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9139f00cebfadced76bca3084"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e577dcf9bb6d084373ed399850"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97ab59cb592c7cec109741b592"`);
        await queryRunner.query(`DROP TABLE "invitations"`);
        await queryRunner.query(`DROP TYPE "public"."invitations_status_enum"`);
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
        await queryRunner.query(`DROP TABLE "materials"`);
        await queryRunner.query(`DROP TYPE "public"."materials_measuretype_enum"`);
        await queryRunner.query(`DROP TABLE "stock_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."stock_transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "printers"`);
        await queryRunner.query(`DROP TYPE "public"."printers_status_enum"`);
        await queryRunner.query(`DROP TABLE "progress_log"`);
        await queryRunner.query(`DROP TABLE "message"`);
        await queryRunner.query(`DROP TABLE "wastage_log"`);
    }

}
