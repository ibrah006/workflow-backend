export async function addForeignKeyIfNotExists(
    queryRunner: any,
    options: {
      table: string;
      constraintName: string;
      column: string;
      referencedTable: string;
      referencedColumn: string;
      onDelete?: string;
      onUpdate?: string;
    }
  ) {
    const {
      table,
      constraintName,
      column,
      referencedTable,
      referencedColumn,
      onDelete = 'NO ACTION',
      onUpdate = 'NO ACTION',
    } = options;
  
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${constraintName}'
        ) THEN
          ALTER TABLE "${table}"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("${column}")
          REFERENCES "${referencedTable}"("${referencedColumn}")
          ON DELETE ${onDelete}
          ON UPDATE ${onUpdate};
        END IF;
      END
      $$;
    `);
  }
  