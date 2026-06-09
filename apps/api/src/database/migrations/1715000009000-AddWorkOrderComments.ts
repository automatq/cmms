import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkOrderComments1715000009000 implements MigrationInterface {
  name = 'AddWorkOrderComments1715000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "wo_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "body" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wo_comments_wo" FOREIGN KEY ("wo_id")
          REFERENCES "work_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wo_comments_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wo_comments_wo_created"
        ON "wo_comments" ("wo_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wo_comments_tenant"
        ON "wo_comments" ("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_comments"`);
  }
}
