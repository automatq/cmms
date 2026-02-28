import { Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../modules/users/entities/tenant.entity';

/**
 * Abstract base class for all tenant-scoped entities.
 * Provides the tenantId column and Tenant relationship.
 * All entities that should be isolated per tenant must extend this class.
 */
export abstract class TenantAwareEntity {
  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
