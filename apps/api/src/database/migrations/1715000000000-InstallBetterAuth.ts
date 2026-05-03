import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Install Better Auth schema:
 * - Renames `tenants` -> `organizations` (FKs preserved by Postgres)
 * - Promotes existing `users` table to Better Auth's user model (drops tenant scoping; users are global identities)
 * - Creates Better Auth tables: sessions, accounts, verifications, members, invitations
 * - Removes legacy migration entries that have been deleted from disk
 * - Truncates organizations CASCADE to nuke test data; signups will recreate
 *
 * Idempotent (uses IF EXISTS / IF NOT EXISTS / DO blocks) so it can be re-run on
 * partially-applied DBs.
 */
export class InstallBetterAuth1715000000000 implements MigrationInterface {
  name = 'InstallBetterAuth1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Drop entries in migrations table for the legacy migrations whose files
    //    were deleted (RenameAuth0ToClerk, RenameClerkToAuth0, SeedDefault).
    //    Without this, TypeORM crashes on next start ("can't find migration").
    await queryRunner.query(`
      DELETE FROM migrations WHERE name IN (
        'RenameAuth0ToClerk1709000004000',
        'RenameClerkToAuth01714000000000',
        'SeedDefaultTenantAndUser1714000001000'
      )
    `);

    // 1. Rename tenants -> organizations. PostgreSQL preserves all FKs because
    //    they reference the table by OID, not name.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants')
           AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
        THEN
          ALTER TABLE "tenants" RENAME TO "organizations";
        END IF;
      END $$;
    `);

    // 2. Add Better Auth required columns to organizations.
    //    Existing columns (name, slug, logo_url, timezone, etc.) stay.
    //    Better Auth needs: logo TEXT, metadata JSONB.
    //    `logo_url` already exists as TEXT - we'll alias `logo` to it via Better Auth fields config.
    await queryRunner.query(`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb`);

    // 3. Drop the leftover auth0_org_id column from organizations
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "auth0_org_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_auth0_org_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_clerk_org_id"`);

    // 4. Mutate users table to be Better Auth compatible.
    //    - Drop tenant_id (users are global identities)
    //    - Drop tenant-scoped unique constraints on email/username
    //    - Add Better Auth columns: name, email_verified, image
    //    NOTE: globally-unique email constraint is added AFTER truncating data
    //    (existing rows may have duplicate emails across tenants).
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_tenant"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_tenant_email"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_tenant_username"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_tenant"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "tenant_id"`);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" VARCHAR`);

    // Make first_name and last_name nullable (Better Auth uses single `name` field)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "first_name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL`);

    // 5. Sessions table (Better Auth)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" UUID PRIMARY KEY,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "token" VARCHAR NOT NULL UNIQUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "ip_address" VARCHAR,
        "user_agent" TEXT,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "active_organization_id" UUID REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sessions_user" ON "sessions" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sessions_token" ON "sessions" ("token")`);

    // 6. Accounts table (OAuth + email/password credentials)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" UUID PRIMARY KEY,
        "account_id" VARCHAR NOT NULL,
        "provider_id" VARCHAR NOT NULL,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "access_token" TEXT,
        "refresh_token" TEXT,
        "id_token" TEXT,
        "access_token_expires_at" TIMESTAMPTZ,
        "refresh_token_expires_at" TIMESTAMPTZ,
        "scope" VARCHAR,
        "password" VARCHAR,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_accounts_user" ON "accounts" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_accounts_provider" ON "accounts" ("provider_id", "account_id")`);

    // 7. Verifications table (email verification, password reset tokens)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "verifications" (
        "id" UUID PRIMARY KEY,
        "identifier" VARCHAR NOT NULL,
        "value" TEXT NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_verifications_identifier" ON "verifications" ("identifier")`);

    // 8. Members table (user <-> organization with role)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "members" (
        "id" UUID PRIMARY KEY,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" VARCHAR NOT NULL DEFAULT 'member',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("organization_id", "user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_members_org" ON "members" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_members_user" ON "members" ("user_id")`);

    // 9. Invitations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" UUID PRIMARY KEY,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "email" VARCHAR NOT NULL,
        "role" VARCHAR DEFAULT 'member',
        "status" VARCHAR NOT NULL DEFAULT 'pending',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "inviter_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invitations_org" ON "invitations" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invitations_email" ON "invitations" ("email")`);

    // 10. NUKE existing data - signups will repopulate.
    //     CASCADE ripples through every tenant_id FK we've already preserved.
    await queryRunner.query(`TRUNCATE TABLE "organizations" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "users" CASCADE`);

    // 11. NOW add the globally-unique email constraint (after truncating, so duplicate
    //     emails from the per-tenant era don't block index creation).
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No-op: this migration is destructive (truncates data) and renaming back
    // would require restoring all FKs. Don't run down() on this in production.
  }
}
