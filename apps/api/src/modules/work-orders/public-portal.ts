import { Tenant, TenantStatus } from '../users/entities/tenant.entity';

/**
 * A tenant may accept anonymous work requests only while it is active and has
 * the work-request portal module enabled. Anything else is reported as "not
 * found" so the endpoint doesn't reveal which organizations exist.
 */
export function isPublicPortalOpen(tenant: Tenant | null | undefined): tenant is Tenant {
  return (
    !!tenant &&
    tenant.status !== TenantStatus.SUSPENDED &&
    tenant.status !== TenantStatus.CANCELLED &&
    tenant.modules?.workRequestsPortal === true
  );
}
