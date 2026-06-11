import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../users/entities/audit-log.entity';

export interface AuditEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  afterData?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /** Best-effort tenant-scoped audit write — never throws into the caller. */
  async record(entry: AuditEntry, tenantId: string): Promise<void> {
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          tenantId,
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          afterData: entry.afterData ?? null,
        } as Partial<AuditLog>),
      );
    } catch (err) {
      this.logger.warn(`audit write failed (${entry.action}): ${err instanceof Error ? err.message : err}`);
    }
  }

  async list(
    tenantId: string,
    opts: { limit?: number; resourceType?: string; resourceId?: string } = {},
  ): Promise<AuditLog[]> {
    const qb = this.auditRepository
      .createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId })
      .orderBy('a.createdAt', 'DESC')
      .take(Math.min(opts.limit ?? 100, 500));
    if (opts.resourceType) qb.andWhere('a.resourceType = :rt', { rt: opts.resourceType });
    if (opts.resourceId) qb.andWhere('a.resourceId = :rid', { rid: opts.resourceId });
    return qb.getMany();
  }
}
