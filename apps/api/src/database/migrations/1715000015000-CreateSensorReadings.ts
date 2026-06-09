import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSensorReadings1715000015000 implements MigrationInterface {
  name = 'CreateSensorReadings1715000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sensor_readings" (
        "tenant_id" uuid NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "metric" character varying NOT NULL,
        "value" numeric(14,4) NOT NULL,
        "unit" character varying,
        "source" character varying,
        "recorded_at" timestamptz NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sensor_readings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sensor_readings_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE
      )
    `);
    // Latest-reading-per-(asset, metric) lookups for condition evaluation.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sensor_readings_lookup" ON "sensor_readings" ("tenant_id", "asset_id", "metric", "recorded_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sensor_readings_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sensor_readings"`);
  }
}
