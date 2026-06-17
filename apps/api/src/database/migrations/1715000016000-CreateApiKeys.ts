import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeys1715000016000 implements MigrationInterface {
  name = 'CreateApiKeys1715000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "tenant_id" uuid NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "key_prefix" character varying NOT NULL,
        "key_hash" character varying NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "created_by" uuid NOT NULL,
        "last_used_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_api_keys_hash" UNIQUE ("key_hash"),
        CONSTRAINT "FK_api_keys_tenant" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_tenant" ON "api_keys" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
  }
}
