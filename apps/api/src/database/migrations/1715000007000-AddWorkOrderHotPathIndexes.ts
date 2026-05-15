import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkOrderHotPathIndexes1715000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite for getOverdueCount(): WHERE tenant_id = ? AND status IN (...)
    // AND scheduled_end < now. Postgres can use this to satisfy all three
    // predicates from a single index scan instead of falling back to the
    // single-column IDX_work_orders_status and re-checking the rest.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_orders_tenant_status_scheduled_end"
        ON "work_orders" ("tenant_id", "status", "scheduled_end");
    `);

    // Composite for findAll()'s default ORDER BY tenant_id, created_at DESC.
    // Removes a sort step on every paginated WO list query.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_orders_tenant_created_at"
        ON "work_orders" ("tenant_id", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_orders_tenant_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_orders_tenant_status_scheduled_end";`);
  }
}
