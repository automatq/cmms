import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Asset, AssetStatus, AssetDowntime } from './entities';

@Injectable()
export class DowntimeService {
  private readonly logger = new Logger(DowntimeService.name);

  constructor(
    @InjectRepository(AssetDowntime)
    private readonly downtimeRepository: Repository<AssetDowntime>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async startDowntime(
    assetId: string,
    reason: string | null,
    workOrderId: string | null,
    userId: string,
    tenantId: string,
  ): Promise<AssetDowntime> {
    // Check for existing open downtime
    const existing = await this.downtimeRepository.findOne({
      where: { assetId, endedAt: IsNull(), tenantId },
    });

    if (existing) {
      return existing; // Already tracking downtime, idempotent
    }

    const asset = await this.assetRepository.findOne({
      where: { id: assetId, tenantId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset ${assetId} not found`);
    }

    const downtime = this.downtimeRepository.create({
      assetId,
      workOrderId,
      startedAt: new Date(),
      reason,
      reportedBy: userId,
      tenantId,
    });

    const saved = await this.downtimeRepository.save(downtime);

    // Update asset status
    asset.status = AssetStatus.UNDER_REPAIR;
    await this.assetRepository.save(asset);

    return saved;
  }

  async endDowntime(
    assetId: string,
    userId: string,
    tenantId: string,
  ): Promise<AssetDowntime> {
    const downtime = await this.downtimeRepository.findOne({
      where: { assetId, endedAt: IsNull(), tenantId },
    });

    if (!downtime) {
      throw new NotFoundException(`No active downtime found for asset ${assetId}`);
    }

    downtime.endedAt = new Date();
    downtime.durationMinutes = Math.round(
      (downtime.endedAt.getTime() - downtime.startedAt.getTime()) / 60000,
    );

    const saved = await this.downtimeRepository.save(downtime);

    // Restore asset status
    const asset = await this.assetRepository.findOne({
      where: { id: assetId, tenantId },
    });
    if (asset) {
      asset.status = AssetStatus.ACTIVE;
      await this.assetRepository.save(asset);
    }

    return saved;
  }

  async getDowntimeHistory(
    assetId: string,
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<AssetDowntime[]> {
    const qb = this.downtimeRepository
      .createQueryBuilder('d')
      .where('d.assetId = :assetId', { assetId })
      .andWhere('d.tenantId = :tenantId', { tenantId });

    if (dateFrom) {
      qb.andWhere('d.startedAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('d.startedAt <= :dateTo', { dateTo });
    }

    return qb.orderBy('d.startedAt', 'DESC').getMany();
  }

  async getActiveDowntime(assetId: string, tenantId: string): Promise<AssetDowntime | null> {
    return this.downtimeRepository.findOne({
      where: { assetId, endedAt: IsNull(), tenantId },
    });
  }

  async calculateMTBF(
    assetId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number | null> {
    const downtimes = await this.downtimeRepository
      .createQueryBuilder('d')
      .where('d.assetId = :assetId', { assetId })
      .andWhere('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.startedAt >= :startDate', { startDate })
      .andWhere('d.startedAt <= :endDate', { endDate })
      .andWhere('d.endedAt IS NOT NULL')
      .orderBy('d.startedAt', 'ASC')
      .getMany();

    if (downtimes.length < 2) return null;

    const totalPeriodMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    const totalDowntimeMinutes = downtimes.reduce(
      (sum, d) => sum + (d.durationMinutes || 0),
      0,
    );
    const uptimeMinutes = totalPeriodMinutes - totalDowntimeMinutes;
    const failureCount = downtimes.length;

    // MTBF = total uptime / number of failures (in hours)
    return Math.round((uptimeMinutes / failureCount / 60) * 100) / 100;
  }

  async calculateMTTR(
    assetId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number | null> {
    const result = await this.downtimeRepository
      .createQueryBuilder('d')
      .select('AVG(d.duration_minutes)', 'avgMinutes')
      .addSelect('COUNT(*)', 'count')
      .where('d.assetId = :assetId', { assetId })
      .andWhere('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.startedAt >= :startDate', { startDate })
      .andWhere('d.startedAt <= :endDate', { endDate })
      .andWhere('d.endedAt IS NOT NULL')
      .getRawOne();

    if (!result || parseInt(result.count) === 0) return null;

    // MTTR in hours
    return Math.round((parseFloat(result.avgMinutes) / 60) * 100) / 100;
  }

  async getDowntimeReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalDowntimeHours: number;
    incidentCount: number;
    avgMttrHours: number | null;
    byAsset: Array<{
      assetId: string;
      assetName: string;
      downtimeHours: number;
      incidentCount: number;
      mttrHours: number | null;
    }>;
  }> {
    const results = await this.downtimeRepository
      .createQueryBuilder('d')
      .leftJoin('d.asset', 'asset')
      .select('d.asset_id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('SUM(d.duration_minutes)', 'totalMinutes')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(d.duration_minutes)', 'avgMinutes')
      .where('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.startedAt >= :startDate', { startDate })
      .andWhere('d.startedAt <= :endDate', { endDate })
      .andWhere('d.endedAt IS NOT NULL')
      .groupBy('d.asset_id')
      .addGroupBy('asset.name')
      .orderBy('SUM(d.duration_minutes)', 'DESC')
      .getRawMany();

    const totalMinutes = results.reduce(
      (sum, r) => sum + parseFloat(r.totalMinutes || '0'),
      0,
    );
    const totalCount = results.reduce(
      (sum, r) => sum + parseInt(r.count || '0'),
      0,
    );

    return {
      totalDowntimeHours: Math.round((totalMinutes / 60) * 100) / 100,
      incidentCount: totalCount,
      avgMttrHours:
        totalCount > 0
          ? Math.round((totalMinutes / totalCount / 60) * 100) / 100
          : null,
      byAsset: results.map((r) => ({
        assetId: r.assetId,
        assetName: r.assetName,
        downtimeHours: Math.round((parseFloat(r.totalMinutes || '0') / 60) * 100) / 100,
        incidentCount: parseInt(r.count),
        mttrHours:
          parseInt(r.count) > 0
            ? Math.round((parseFloat(r.avgMinutes || '0') / 60) * 100) / 100
            : null,
      })),
    };
  }
}
