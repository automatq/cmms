import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalFilenameToImportJob1715000005000 implements MigrationInterface {
  name = 'AddOriginalFilenameToImportJob1715000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE import_jobs
        ADD COLUMN IF NOT EXISTS original_filename VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE import_jobs DROP COLUMN IF EXISTS original_filename`);
  }
}
