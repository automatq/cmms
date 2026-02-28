import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  SelectQueryBuilder,
  SaveOptions,
  FindOptionsWhere,
} from 'typeorm';
import { TenantAwareEntity } from '../entities/tenant-aware.entity';

/**
 * A wrapper around TypeORM's Repository that automatically scopes all
 * operations to a specific tenant. Provides defense-in-depth on top of RLS.
 *
 * Usage in services:
 *   const repo = new TenantRepository(this.assetRepository, tenantId);
 *   const assets = await repo.find({ where: { status: 'active' } });
 *   // Automatically adds: AND tenant_id = :tenantId
 */
export class TenantRepository<T extends TenantAwareEntity> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly tenantId: string,
  ) {}

  /**
   * Find multiple entities, automatically scoped to the tenant.
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(this.scopeOptions(options));
  }

  /**
   * Find one entity, automatically scoped to the tenant.
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(this.scopeOptions(options));
  }

  /**
   * Find and count, automatically scoped to the tenant.
   */
  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.repository.findAndCount(this.scopeOptions(options));
  }

  /**
   * Count entities, automatically scoped to the tenant.
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(this.scopeOptions(options));
  }

  /**
   * Create a new entity instance with tenantId pre-set.
   */
  create(data: DeepPartial<T>): T {
    return this.repository.create({
      ...data,
      tenantId: this.tenantId,
    } as DeepPartial<T>);
  }

  /**
   * Save an entity, ensuring tenantId is set.
   */
  async save(entity: T, options?: SaveOptions): Promise<T>;
  async save(entities: T[], options?: SaveOptions): Promise<T[]>;
  async save(entityOrEntities: T | T[], options?: SaveOptions): Promise<T | T[]> {
    if (Array.isArray(entityOrEntities)) {
      entityOrEntities.forEach((e) => {
        e.tenantId = this.tenantId;
      });
      return this.repository.save(entityOrEntities, options);
    }
    entityOrEntities.tenantId = this.tenantId;
    return this.repository.save(entityOrEntities, options);
  }

  /**
   * Update entities matching criteria, scoped to tenant.
   */
  async update(criteria: FindOptionsWhere<T>, data: DeepPartial<T>) {
    const scopedCriteria = { ...criteria, tenantId: this.tenantId } as FindOptionsWhere<T>;
    return this.repository.update(scopedCriteria, data as any);
  }

  /**
   * Remove an entity (verifying it belongs to this tenant).
   */
  async remove(entity: T): Promise<T> {
    if (entity.tenantId !== this.tenantId) {
      throw new Error('Cannot remove entity belonging to a different tenant');
    }
    return this.repository.remove(entity);
  }

  /**
   * Delete entities matching criteria, scoped to tenant.
   */
  async delete(criteria: FindOptionsWhere<T>) {
    const scopedCriteria = { ...criteria, tenantId: this.tenantId } as FindOptionsWhere<T>;
    return this.repository.delete(scopedCriteria);
  }

  /**
   * Create a QueryBuilder that is pre-filtered by tenant.
   */
  createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId: this.tenantId });
  }

  /**
   * Access the underlying repository for advanced operations.
   * Use with caution -- no automatic tenant scoping.
   */
  get raw(): Repository<T> {
    return this.repository;
  }

  /**
   * Add tenantId filter to FindOptions.
   */
  private scopeOptions<O extends FindManyOptions<T> | FindOneOptions<T>>(
    options?: O,
  ): O {
    if (!options) {
      return { where: { tenantId: this.tenantId } } as O;
    }

    if (options.where) {
      if (Array.isArray(options.where)) {
        options.where = options.where.map((w) => ({
          ...w,
          tenantId: this.tenantId,
        })) as any;
      } else {
        options.where = {
          ...options.where,
          tenantId: this.tenantId,
        } as any;
      }
    } else {
      options.where = { tenantId: this.tenantId } as any;
    }

    return options;
  }
}
