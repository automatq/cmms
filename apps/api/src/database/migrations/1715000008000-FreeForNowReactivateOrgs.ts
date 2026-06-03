import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Free-for-now launch: re-activate every org that a prior trial-expiry
 * sweep had flipped to 'suspended'/'cancelled', and give all orgs the full
 * module set. Pairs with the BILLING_ENFORCED env flag (default off) which
 * stops the JwtAuthGuard from suspending trials and the FeatureGateGuard
 * from per-plan gating. This migration just cleans up data that the old
 * behavior already wrote, so existing customers aren't stuck 'suspended'.
 *
 * Idempotent: only touches rows not already 'active', and the modules
 * UPDATE is a straight overwrite to the full set.
 */
export class FreeForNowReactivateOrgs1715000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Reactivate any org parked in a billing-blocked status.
    await queryRunner.query(`
      UPDATE organizations
         SET status = 'active', updated_at = now()
       WHERE status IN ('suspended', 'cancelled', 'trial');
    `);

    // 2. Ensure every org has the full module set enabled (so that even if
    //    BILLING_ENFORCED is later turned on, current customers keep access
    //    until an explicit plan change). sensors stays off (hardware-gated).
    await queryRunner.query(`
      UPDATE organizations
         SET modules = '{"preventiveMaintenance":true,"inventory":true,"purchaseOrders":true,"reports":true,"aiAssistant":true,"sensors":false,"workRequestsPortal":true,"dataImport":true}'::jsonb,
             updated_at = now();
    `);
  }

  public async down(): Promise<void> {
    // No-op: reactivating orgs is not something we'd want to automatically
    // reverse (it would re-suspend live customers). Intentionally empty.
  }
}
