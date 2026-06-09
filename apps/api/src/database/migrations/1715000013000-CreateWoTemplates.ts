import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWoTemplates1715000013000 implements MigrationInterface {
  name = 'CreateWoTemplates1715000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_templates" (
        "tenant_id" uuid NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "type" "work_order_type_enum" NOT NULL DEFAULT 'corrective',
        "default_priority" "priority_enum" NOT NULL DEFAULT 'medium',
        "checklist_template_id" uuid,
        "estimated_hours" numeric(6,2),
        "asset_id" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wo_templates_tenant" ON "wo_templates" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wo_templates_tenant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_templates"`);
  }
}
