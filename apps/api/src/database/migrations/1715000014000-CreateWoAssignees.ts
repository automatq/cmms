import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWoAssignees1715000014000 implements MigrationInterface {
  name = 'CreateWoAssignees1715000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_assignees" (
        "tenant_id" uuid NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wo_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_assignees" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wo_assignees_wo_user" UNIQUE ("wo_id", "user_id"),
        CONSTRAINT "FK_wo_assignees_wo" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wo_assignees_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wo_assignees_wo" ON "wo_assignees" ("wo_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wo_assignees_user" ON "wo_assignees" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_assignees"`);
  }
}
