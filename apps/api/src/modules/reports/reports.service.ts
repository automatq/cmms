import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull, Not } from 'typeorm';
import { WorkOrder, WorkOrderStatus, WorkOrderType, Priority } from '../work-orders/entities/work-order.entity';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';
import { PmPlan } from '../pm/entities/pm-plan.entity';
import { PmHistory, PmHistoryStatus } from '../pm/entities/pm-history.entity';
import { Part } from '../inventory/entities/part.entity';
import { InventoryStock } from '../inventory/entities/inventory-stock.entity';
import { InventoryTransaction, TransactionType } from '../inventory/entities/inventory-transaction.entity';
import {
  ReportQueryDto,
  WorkOrderReportQueryDto,
  AssetReportQueryDto,
  InventoryReportQueryDto,
  DashboardQueryDto,
  ReportPeriod,
} from './dto';

interface KpiMetric {
  label: string;
  value: number;
  unit?: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
}

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

interface LowStockPart {
  partId: string;
  partName: string;
  sku: string;
  qtyOnHand: number;
  reorderPoint: number;
  deficit: number;
}

export { KpiMetric, ChartDataPoint, LowStockPart };

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(PmPlan)
    private pmPlanRepo: Repository<PmPlan>,
    @InjectRepository(PmHistory)
    private pmHistoryRepo: Repository<PmHistory>,
    @InjectRepository(Part)
    private partRepo: Repository<Part>,
    @InjectRepository(InventoryStock)
    private stockRepo: Repository<InventoryStock>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
  ) { }

  // ==================== DASHBOARD ====================

  async getDashboardSummary(query: DashboardQueryDto, tenantId: string): Promise<{
    kpis: KpiMetric[];
    workOrdersByStatus: ChartDataPoint[];
    workOrdersByPriority: ChartDataPoint[];
    recentActivity: any[];
    upcomingPMs: any[];
    lowStockAlerts: any[];
  }> {
    const days = query.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Work Order KPIs
    const [totalWOs, openWOs, completedWOs, overdueWOs] = await Promise.all([
      this.workOrderRepo.count({ where: { tenantId, createdAt: Between(startDate, new Date()) } }),
      this.workOrderRepo.count({ where: { tenantId, status: In([WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS]) } }),
      this.workOrderRepo.count({ where: { tenantId, status: WorkOrderStatus.COMPLETED, completedAt: Between(startDate, new Date()) } }),
      this.workOrderRepo.count({ where: { tenantId, status: In([WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS]), dueDate: Not(IsNull()) } })
        .then(async () => {
          const now = new Date();
          return this.workOrderRepo.createQueryBuilder('wo')
            .where('wo.tenantId = :tenantId', { tenantId })
            .andWhere('wo.status IN (:...statuses)', { statuses: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS] })
            .andWhere('wo.dueDate < :now', { now })
            .getCount();
        }),
    ]);

    // Planned vs Unplanned ratio
    const [plannedWOs, totalPeriodWOs] = await Promise.all([
      this.workOrderRepo.count({
        where: { tenantId, type: In([WorkOrderType.PREVENTIVE, WorkOrderType.INSPECTION]), createdAt: Between(startDate, new Date()) },
      }),
      this.workOrderRepo.count({
        where: { tenantId, createdAt: Between(startDate, new Date()) },
      }),
    ]);
    const plannedRatio = totalPeriodWOs > 0 ? Math.round((plannedWOs / totalPeriodWOs) * 100) : 0;

    // Calculate MTTR (Mean Time To Repair)
    const mttrResult = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('AVG(wo.actualHours)', 'mttr')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: WorkOrderStatus.COMPLETED })
      .andWhere('wo.completedAt BETWEEN :start AND :end', { start: startDate, end: new Date() })
      .andWhere('wo.actualHours IS NOT NULL')
      .getRawOne();

    // PM Compliance
    const pmCompliance = await this.calculatePmCompliance(startDate, new Date(), tenantId);

    // Work Orders by Status
    const woByStatus = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('wo.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .groupBy('wo.status')
      .getRawMany();

    // Work Orders by Priority
    const woByPriority = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('wo.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status NOT IN (:...statuses)', { statuses: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED] })
      .groupBy('wo.priority')
      .getRawMany();

    // Recent Activity (last 10 completed WOs)
    const recentActivity = await this.workOrderRepo.find({
      where: { tenantId, status: WorkOrderStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: 10,
      relations: ['asset'],
    });

    // Upcoming PMs (next 10)
    const upcomingPMs = await this.pmPlanRepo.find({
      where: { tenantId, isActive: true, nextDueAt: Not(IsNull()) },
      order: { nextDueAt: 'ASC' },
      take: 10,
      relations: ['asset'],
    });

    // Low Stock Alerts
    const lowStockAlerts = await this.getLowStockParts(tenantId);

    return {
      kpis: [
        { label: 'Open Work Orders', value: openWOs, trend: 0, trendDirection: 'neutral' },
        { label: 'Completed (Period)', value: completedWOs, trend: 0, trendDirection: 'neutral' },
        { label: 'Overdue', value: overdueWOs, trend: 0, trendDirection: overdueWOs > 0 ? 'up' : 'neutral' },
        { label: 'MTTR', value: parseFloat(mttrResult?.mttr || '0'), unit: 'hours' },
        { label: 'PM Compliance', value: pmCompliance, unit: '%' },
        { label: 'Planned %', value: plannedRatio, unit: '%', trend: 0, trendDirection: plannedRatio >= 80 ? 'up' : 'down' },
      ],
      workOrdersByStatus: woByStatus.map((s) => ({ label: s.status, value: parseInt(s.count, 10) })),
      workOrdersByPriority: woByPriority.map((p) => ({ label: p.priority, value: parseInt(p.count, 10) })),
      recentActivity: recentActivity.map((wo) => ({
        id: wo.id,
        woNumber: wo.woNumber,
        title: wo.title,
        asset: wo.asset?.name,
        completedAt: wo.completedAt,
      })),
      upcomingPMs: upcomingPMs.map((pm) => ({
        id: pm.id,
        name: pm.name,
        asset: pm.asset?.name,
        nextDueAt: pm.nextDueAt,
      })),
      lowStockAlerts,
    };
  }

  // ==================== WORK ORDER REPORTS ====================

  async getWorkOrderReport(query: WorkOrderReportQueryDto, tenantId: string): Promise<{
    summary: any;
    byType: ChartDataPoint[];
    byPriority: ChartDataPoint[];
    byTechnician: ChartDataPoint[];
    trend: ChartDataPoint[];
    details: any[];
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const qb = this.workOrderRepo.createQueryBuilder('wo')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate });

    if (query.type) qb.andWhere('wo.type = :type', { type: query.type });
    if (query.priority) qb.andWhere('wo.priority = :priority', { priority: query.priority });
    if (query.assetId) qb.andWhere('wo.assetId = :assetId', { assetId: query.assetId });
    if (query.technicianId) qb.andWhere(':techId = ANY(wo.assignedTo)', { techId: query.technicianId });

    // Summary stats
    const totalCount = await qb.getCount();
    const completedCount = await qb.clone()
      .andWhere('wo.status = :status', { status: WorkOrderStatus.COMPLETED })
      .getCount();

    const avgCompletionTime = await qb.clone()
      .select('AVG(wo.actualHours)', 'avg')
      .andWhere('wo.actualHours IS NOT NULL')
      .getRawOne();

    const totalLaborCost = await qb.clone()
      .select('SUM(wo.actualCost)', 'total')
      .getRawOne();

    // By Type
    const byType = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('wo.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('wo.type')
      .getRawMany();

    // By Priority
    const byPriority = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('wo.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('wo.priority')
      .getRawMany();

    // By Technician (top 10)
    const byTechnician = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('UNNEST(wo.assignedTo)', 'technician')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('wo.assignedTo IS NOT NULL')
      .groupBy('UNNEST(wo.assignedTo)')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Trend (group by period)
    const trend = await this.getWorkOrderTrend(startDate, endDate, query.groupBy || ReportPeriod.DAY, tenantId);

    return {
      summary: {
        total: totalCount,
        completed: completedCount,
        completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        avgCompletionTime: parseFloat(avgCompletionTime?.avg || '0').toFixed(1),
        totalCost: parseFloat(totalLaborCost?.total || '0').toFixed(2),
      },
      byType: byType.map((t) => ({ label: t.type, value: parseInt(t.count, 10) })),
      byPriority: byPriority.map((p) => ({ label: p.priority, value: parseInt(p.count, 10) })),
      byTechnician: byTechnician.map((t) => ({ label: t.technician, value: parseInt(t.count, 10) })),
      trend,
      details: [], // Would include paginated WO list
    };
  }

  private async getWorkOrderTrend(startDate: Date, endDate: Date, period: ReportPeriod, tenantId: string): Promise<ChartDataPoint[]> {
    let dateFormat: string;
    switch (period) {
      case ReportPeriod.DAY:
        dateFormat = 'YYYY-MM-DD';
        break;
      case ReportPeriod.WEEK:
        dateFormat = 'IYYY-IW';
        break;
      case ReportPeriod.MONTH:
        dateFormat = 'YYYY-MM';
        break;
      case ReportPeriod.QUARTER:
        dateFormat = 'YYYY-"Q"Q';
        break;
      case ReportPeriod.YEAR:
        dateFormat = 'YYYY';
        break;
    }

    const result = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select(`TO_CHAR(wo.createdAt, '${dateFormat}')`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return result.map((r) => ({ label: r.period, value: parseInt(r.count, 10) }));
  }

  // ==================== ASSET REPORTS ====================

  async getAssetReport(query: AssetReportQueryDto, tenantId: string): Promise<{
    summary: any;
    byStatus: ChartDataPoint[];
    byCategory: ChartDataPoint[];
    byLocation: ChartDataPoint[];
    topFailures: any[];
    mtbfByAsset: any[];
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Summary
    const [totalAssets, activeAssets, underRepair] = await Promise.all([
      this.assetRepo.count({ where: { tenantId } }),
      this.assetRepo.count({ where: { tenantId, status: AssetStatus.ACTIVE } }),
      this.assetRepo.count({ where: { tenantId, status: AssetStatus.UNDER_REPAIR } }),
    ]);

    // By Status
    const byStatus = await this.assetRepo
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('asset.tenantId = :tenantId', { tenantId })
      .groupBy('asset.status')
      .getRawMany();

    // By Category
    const byCategory = await this.assetRepo
      .createQueryBuilder('asset')
      .leftJoin('asset.category', 'category')
      .select('COALESCE(category.name, \'Uncategorized\')', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('asset.tenantId = :tenantId', { tenantId })
      .groupBy('category.name')
      .getRawMany();

    // By Location
    const byLocation = await this.assetRepo
      .createQueryBuilder('asset')
      .leftJoin('asset.location', 'location')
      .select('COALESCE(location.name, \'No Location\')', 'location')
      .addSelect('COUNT(*)', 'count')
      .where('asset.tenantId = :tenantId', { tenantId })
      .groupBy('location.name')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Top Failures (assets with most corrective WOs)
    const topFailures = await this.workOrderRepo
      .createQueryBuilder('wo')
      .leftJoin('wo.asset', 'asset')
      .select('asset.id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('asset.assetNumber', 'assetNumber')
      .addSelect('COUNT(*)', 'failureCount')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.type = :type', { type: WorkOrderType.CORRECTIVE })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('wo.assetId IS NOT NULL')
      .groupBy('asset.id')
      .addGroupBy('asset.name')
      .addGroupBy('asset.assetNumber')
      .orderBy('failureCount', 'DESC')
      .limit(10)
      .getRawMany();

    // MTBF by Asset (Mean Time Between Failures)
    const mtbfByAsset = await this.calculateMTBF(startDate, endDate, tenantId);

    return {
      summary: {
        total: totalAssets,
        active: activeAssets,
        underRepair,
        retiredOrInactive: totalAssets - activeAssets - underRepair,
      },
      byStatus: byStatus.map((s) => ({ label: s.status, value: parseInt(s.count, 10) })),
      byCategory: byCategory.map((c) => ({ label: c.category, value: parseInt(c.count, 10) })),
      byLocation: byLocation.map((l) => ({ label: l.location, value: parseInt(l.count, 10) })),
      topFailures: topFailures.map((f) => ({
        assetId: f.assetId,
        assetName: f.assetName,
        assetNumber: f.assetNumber,
        failureCount: parseInt(f.failureCount, 10),
      })),
      mtbfByAsset,
    };
  }

  private async calculateMTBF(startDate: Date, endDate: Date, tenantId: string): Promise<any[]> {
    // Simplified MTBF calculation
    const result = await this.workOrderRepo
      .createQueryBuilder('wo')
      .leftJoin('wo.asset', 'asset')
      .select('asset.id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('COUNT(*)', 'failureCount')
      .addSelect(`EXTRACT(EPOCH FROM (:end::timestamp - :start::timestamp)) / 3600 / NULLIF(COUNT(*), 0)`, 'mtbf')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.type = :type', { type: WorkOrderType.CORRECTIVE })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('wo.assetId IS NOT NULL')
      .groupBy('asset.id')
      .addGroupBy('asset.name')
      .having('COUNT(*) > 1')
      .orderBy('mtbf', 'ASC')
      .setParameters({ start: startDate, end: endDate })
      .limit(10)
      .getRawMany();

    return result.map((r) => ({
      assetId: r.assetId,
      assetName: r.assetName,
      failureCount: parseInt(r.failureCount, 10),
      mtbfHours: parseFloat(r.mtbf || '0').toFixed(1),
    }));
  }

  // ==================== PM COMPLIANCE REPORTS ====================

  async getPmComplianceReport(query: ReportQueryDto, tenantId: string): Promise<{
    overallCompliance: number;
    byAsset: any[];
    byPlan: any[];
    trend: ChartDataPoint[];
    overdueCount: number;
    upcomingCount: number;
    pmOptimization: any[];
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const overallCompliance = await this.calculatePmCompliance(startDate, endDate, tenantId);

    // Compliance by Asset
    const byAsset = await this.pmHistoryRepo
      .createQueryBuilder('ph')
      .leftJoin('ph.pmPlan', 'plan')
      .leftJoin('plan.asset', 'asset')
      .select('asset.id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN ph.status = 'on_time' THEN 1 ELSE 0 END)`, 'onTime')
      .where('ph.tenantId = :tenantId', { tenantId })
      .andWhere('ph.triggeredAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('asset.id')
      .addGroupBy('asset.name')
      .getRawMany();

    // Compliance by Plan
    const byPlan = await this.pmHistoryRepo
      .createQueryBuilder('ph')
      .leftJoin('ph.pmPlan', 'plan')
      .select('plan.id', 'planId')
      .addSelect('plan.name', 'planName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN ph.status = 'on_time' THEN 1 ELSE 0 END)`, 'onTime')
      .where('ph.tenantId = :tenantId', { tenantId })
      .andWhere('ph.triggeredAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('plan.id')
      .addGroupBy('plan.name')
      .getRawMany();

    // Trend
    const trend = await this.pmHistoryRepo
      .createQueryBuilder('ph')
      .select(`TO_CHAR(ph.triggeredAt, 'YYYY-MM')`, 'period')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN ph.status = 'on_time' THEN 1 ELSE 0 END)`, 'onTime')
      .where('ph.tenantId = :tenantId', { tenantId })
      .andWhere('ph.triggeredAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    // Overdue PMs
    const overdueCount = await this.pmPlanRepo
      .createQueryBuilder('pm')
      .where('pm.tenantId = :tenantId', { tenantId })
      .andWhere('pm.isActive = true')
      .andWhere('pm.nextDueAt < :now', { now: new Date() })
      .getCount();

    // Upcoming PMs (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingCount = await this.pmPlanRepo
      .createQueryBuilder('pm')
      .where('pm.tenantId = :tenantId', { tenantId })
      .andWhere('pm.isActive = true')
      .andWhere('pm.nextDueAt BETWEEN :now AND :next', { now: new Date(), next: nextWeek })
      .getCount();

    // PM Optimization: corrective WOs per asset that has PM plans (failures between PMs)
    const pmOptimizationData = await this.workOrderRepo
      .createQueryBuilder('wo')
      .innerJoin('pm_plans', 'pm', 'pm.asset_id = wo.asset_id AND pm.tenant_id = wo.tenant_id AND pm.is_active = true')
      .leftJoin('wo.asset', 'asset')
      .select('asset.id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('COUNT(wo.id)', 'correctiveCount')
      .addSelect('COUNT(DISTINCT pm.id)', 'activePmPlans')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.type = :type', { type: WorkOrderType.CORRECTIVE })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('wo.assetId IS NOT NULL')
      .groupBy('asset.id')
      .addGroupBy('asset.name')
      .orderBy('correctiveCount', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      overallCompliance,
      byAsset: byAsset.map((a) => ({
        assetId: a.assetId,
        assetName: a.assetName,
        total: parseInt(a.total, 10),
        onTime: parseInt(a.onTime, 10),
        compliance: Math.round((parseInt(a.onTime, 10) / parseInt(a.total, 10)) * 100),
      })),
      byPlan: byPlan.map((p) => ({
        planId: p.planId,
        planName: p.planName,
        total: parseInt(p.total, 10),
        onTime: parseInt(p.onTime, 10),
        compliance: Math.round((parseInt(p.onTime, 10) / parseInt(p.total, 10)) * 100),
      })),
      trend: trend.map((t) => ({
        label: t.period,
        value: Math.round((parseInt(t.onTime, 10) / parseInt(t.total, 10)) * 100),
      })),
      overdueCount,
      upcomingCount,
      pmOptimization: pmOptimizationData.map((r) => ({
        assetId: r.assetId,
        assetName: r.assetName,
        correctiveWOs: parseInt(r.correctiveCount, 10),
        activePmPlans: parseInt(r.activePmPlans, 10),
        recommendation: parseInt(r.correctiveCount, 10) === 0 ? 'consider_extending_interval' :
          parseInt(r.correctiveCount, 10) > 3 ? 'shorten_interval' : 'adequate',
      })),
    };
  }

  private async calculatePmCompliance(startDate: Date, endDate: Date, tenantId: string): Promise<number> {
    const result = await this.pmHistoryRepo
      .createQueryBuilder('ph')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN ph.status = 'on_time' THEN 1 ELSE 0 END)`, 'onTime')
      .where('ph.tenantId = :tenantId', { tenantId })
      .andWhere('ph.triggeredAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const total = parseInt(result?.total || '0', 10);
    const onTime = parseInt(result?.onTime || '0', 10);

    return total > 0 ? Math.round((onTime / total) * 100) : 100;
  }

  // ==================== INVENTORY REPORTS ====================

  async getInventoryReport(query: InventoryReportQueryDto, tenantId: string): Promise<{
    summary: any;
    lowStockItems: any[];
    topConsumedParts: any[];
    stockValueByStoreroom: ChartDataPoint[];
    transactionTrend: ChartDataPoint[];
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Summary
    const [totalParts, lowStockCount, totalValue] = await Promise.all([
      this.partRepo.count({ where: { tenantId } }),
      this.getLowStockParts(tenantId).then((parts) => parts.length),
      this.stockRepo
        .createQueryBuilder('stock')
        .leftJoin('stock.part', 'part')
        .select('SUM(stock.qtyOnHand * COALESCE(part.unitCost, 0))', 'total')
        .where('stock.tenantId = :tenantId', { tenantId })
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
    ]);

    // Low Stock Items
    const lowStockItems = await this.getLowStockParts(tenantId);

    // Top Consumed Parts
    const topConsumedParts = await this.transactionRepo
      .createQueryBuilder('tx')
      .leftJoin('tx.part', 'part')
      .select('part.id', 'partId')
      .addSelect('part.name', 'partName')
      .addSelect('part.sku', 'sku')
      .addSelect('SUM(ABS(tx.qty))', 'totalConsumed')
      .where('tx.tenantId = :tenantId', { tenantId })
      .andWhere('tx.type = :type', { type: TransactionType.ISSUE })
      .andWhere('tx.performedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('part.id')
      .addGroupBy('part.name')
      .addGroupBy('part.sku')
      .orderBy('totalConsumed', 'DESC')
      .limit(10)
      .getRawMany();

    // Stock Value by Storeroom
    const stockValueByStoreroom = await this.stockRepo
      .createQueryBuilder('stock')
      .leftJoin('stock.storeroom', 'storeroom')
      .leftJoin('stock.part', 'part')
      .select('storeroom.name', 'storeroom')
      .addSelect('SUM(stock.qtyOnHand * COALESCE(part.unitCost, 0))', 'value')
      .where('stock.tenantId = :tenantId', { tenantId })
      .groupBy('storeroom.name')
      .orderBy('value', 'DESC')
      .getRawMany();

    // Transaction Trend
    const transactionTrend = await this.transactionRepo
      .createQueryBuilder('tx')
      .select(`TO_CHAR(tx.performedAt, 'YYYY-MM')`, 'period')
      .addSelect('tx.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('tx.tenantId = :tenantId', { tenantId })
      .andWhere('tx.performedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('period')
      .addGroupBy('tx.transactionType')
      .orderBy('period', 'ASC')
      .getRawMany();

    return {
      summary: {
        totalParts,
        lowStockCount,
        totalValue: totalValue.toFixed(2),
      },
      lowStockItems,
      topConsumedParts: topConsumedParts.map((p) => ({
        partId: p.partId,
        partName: p.partName,
        sku: p.sku,
        totalConsumed: parseInt(p.totalConsumed, 10),
      })),
      stockValueByStoreroom: stockValueByStoreroom.map((s) => ({
        label: s.storeroom || 'Unknown',
        value: parseFloat(s.value || '0'),
      })),
      transactionTrend: transactionTrend.map((t) => ({
        label: t.period,
        value: parseInt(t.count, 10),
        category: t.type,
      })),
    };
  }

  private async getLowStockParts(tenantId: string): Promise<LowStockPart[]> {
    const parts = await this.partRepo.find({ where: { tenantId, reorderPoint: Not(IsNull()) } });
    const lowStockParts: LowStockPart[] = [];

    for (const part of parts) {
      if (!part.reorderPoint) continue;

      const stocks = await this.stockRepo.find({ where: { tenantId, partId: part.id } });
      const totalOnHand = stocks.reduce((sum, s) => sum + s.qtyOnHand, 0);

      if (totalOnHand <= part.reorderPoint) {
        lowStockParts.push({
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          qtyOnHand: totalOnHand,
          reorderPoint: part.reorderPoint,
          deficit: part.reorderPoint - totalOnHand,
        });
      }
    }

    return lowStockParts.sort((a, b) => b.deficit - a.deficit).slice(0, 20);
  }

  // ==================== COST REPORTS ====================

  async getCostReport(query: ReportQueryDto, tenantId: string): Promise<{
    totalLaborCost: number;
    totalPartsCost: number;
    totalCost: number;
    costByAsset: any[];
    costByWorkOrderType: ChartDataPoint[];
    costTrend: ChartDataPoint[];
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Total Costs
    const costSummary = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('SUM(wo.actualCost)', 'totalCost')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    // Cost by Asset
    const costByAsset = await this.workOrderRepo
      .createQueryBuilder('wo')
      .leftJoin('wo.asset', 'asset')
      .select('asset.id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('SUM(wo.actualCost)', 'totalCost')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('wo.assetId IS NOT NULL')
      .groupBy('asset.id')
      .addGroupBy('asset.name')
      .orderBy('totalCost', 'DESC')
      .limit(10)
      .getRawMany();

    // Cost by WO Type
    const costByType = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('wo.type', 'type')
      .addSelect('SUM(wo.actualCost)', 'cost')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('wo.type')
      .getRawMany();

    // Cost Trend
    const costTrend = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select(`TO_CHAR(wo.completedAt, 'YYYY-MM')`, 'period')
      .addSelect('SUM(wo.actualCost)', 'cost')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completedAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return {
      totalLaborCost: 0, // Would need labor cost calculation
      totalPartsCost: 0, // Would need parts cost calculation
      totalCost: parseFloat(costSummary?.totalCost || '0'),
      costByAsset: costByAsset.map((a) => ({
        assetId: a.assetId,
        assetName: a.assetName,
        totalCost: parseFloat(a.totalCost || '0'),
      })),
      costByWorkOrderType: costByType.map((t) => ({
        label: t.type,
        value: parseFloat(t.cost || '0'),
      })),
      costTrend: costTrend.map((t) => ({
        label: t.period,
        value: parseFloat(t.cost || '0'),
      })),
    };
  }

  // ==================== TECHNICIAN PERFORMANCE ====================

  async getTechnicianPerformanceReport(query: WorkOrderReportQueryDto, tenantId: string): Promise<{
    technicians: any[];
    wrenchTimeSummary: { totalDirectHours: number; totalTravelHours: number; totalWaitHours: number; wrenchTimePercent: number };
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const techStats = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select('UNNEST(wo.assignedTo)', 'technicianId')
      .addSelect('COUNT(*)', 'totalAssigned')
      .addSelect(`SUM(CASE WHEN wo.status = 'completed' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect('AVG(wo.actualHours)', 'avgHours')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('wo.assignedTo IS NOT NULL')
      .groupBy('UNNEST(wo.assignedTo)')
      .orderBy('completed', 'DESC')
      .getRawMany();

    // Wrench time analysis from wo_labor entries
    const wrenchTimeData = await this.workOrderRepo.manager
      .createQueryBuilder()
      .select('SUM(labor.hours)', 'totalDirect')
      .addSelect('SUM(COALESCE(labor.travel_time, 0))', 'totalTravel')
      .addSelect('SUM(COALESCE(labor.wait_time, 0))', 'totalWait')
      .from('wo_labor', 'labor')
      .where('labor.tenant_id = :tenantId', { tenantId })
      .andWhere('labor.logged_at BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    const totalDirect = parseFloat(wrenchTimeData?.totalDirect || '0');
    const totalTravel = parseFloat(wrenchTimeData?.totalTravel || '0');
    const totalWait = parseFloat(wrenchTimeData?.totalWait || '0');
    const totalAll = totalDirect + totalTravel + totalWait;

    return {
      technicians: techStats.map((t) => ({
        technicianId: t.technicianId,
        totalAssigned: parseInt(t.totalAssigned, 10),
        completed: parseInt(t.completed, 10),
        completionRate: Math.round((parseInt(t.completed, 10) / parseInt(t.totalAssigned, 10)) * 100),
        avgHoursPerWO: parseFloat(t.avgHours || '0').toFixed(1),
      })),
      wrenchTimeSummary: {
        totalDirectHours: Math.round(totalDirect * 10) / 10,
        totalTravelHours: Math.round(totalTravel * 10) / 10,
        totalWaitHours: Math.round(totalWait * 10) / 10,
        wrenchTimePercent: totalAll > 0 ? Math.round((totalDirect / totalAll) * 100) : 0,
      },
    };
  }

  // ==================== OEE (Overall Equipment Effectiveness) ====================

  async getOeeReport(query: ReportQueryDto, tenantId: string): Promise<{
    assets: any[];
    averageAvailability: number;
  }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const totalPeriodHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    // Get downtime hours per asset in the period
    const downtimeData = await this.workOrderRepo.manager
      .createQueryBuilder()
      .select('dt.asset_id', 'assetId')
      .addSelect('asset.name', 'assetName')
      .addSelect('asset.asset_number', 'assetNumber')
      .addSelect('SUM(COALESCE(dt.duration_minutes, 0))', 'totalDowntimeMinutes')
      .addSelect('COUNT(dt.id)', 'downtimeEvents')
      .from('asset_downtimes', 'dt')
      .innerJoin('assets', 'asset', 'asset.id = dt.asset_id')
      .where('dt.tenant_id = :tenantId', { tenantId })
      .andWhere('dt.started_at BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('dt.asset_id')
      .addGroupBy('asset.name')
      .addGroupBy('asset.asset_number')
      .orderBy('totalDowntimeMinutes', 'DESC')
      .getRawMany();

    const assets = downtimeData.map((d) => {
      const downtimeHours = parseFloat(d.totalDowntimeMinutes || '0') / 60;
      const availability = totalPeriodHours > 0
        ? Math.round(((totalPeriodHours - downtimeHours) / totalPeriodHours) * 1000) / 10
        : 100;

      return {
        assetId: d.assetId,
        assetName: d.assetName,
        assetNumber: d.assetNumber,
        totalDowntimeHours: Math.round(downtimeHours * 10) / 10,
        downtimeEvents: parseInt(d.downtimeEvents, 10),
        availability: Math.max(0, availability),
        // Performance and Quality require production data — set to null until integrated
        performance: null as number | null,
        quality: null as number | null,
        oee: null as number | null,
      };
    });

    const avgAvailability = assets.length > 0
      ? Math.round((assets.reduce((sum, a) => sum + a.availability, 0) / assets.length) * 10) / 10
      : 100;

    return {
      assets,
      averageAvailability: avgAvailability,
    };
  }

  // ==================== BACKLOG AGING ====================

  async getBacklogAgingReport(tenantId: string): Promise<{
    buckets: ChartDataPoint[];
    total: number;
    oldestDays: number;
    details: any[];
  }> {
    const now = new Date();

    const openStatuses = [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD];

    const result = await this.workOrderRepo
      .createQueryBuilder('wo')
      .select(`
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - wo.createdAt)) / 86400 <= 7 THEN '0-7 days'
          WHEN EXTRACT(EPOCH FROM (NOW() - wo.createdAt)) / 86400 <= 14 THEN '8-14 days'
          WHEN EXTRACT(EPOCH FROM (NOW() - wo.createdAt)) / 86400 <= 30 THEN '15-30 days'
          ELSE '30+ days'
        END`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...statuses)', { statuses: openStatuses })
      .groupBy('bucket')
      .getRawMany();

    // Order buckets consistently
    const bucketOrder = ['0-7 days', '8-14 days', '15-30 days', '30+ days'];
    const bucketMap = new Map(result.map((r) => [r.bucket, parseInt(r.count, 10)]));
    const buckets = bucketOrder.map((label) => ({ label, value: bucketMap.get(label) || 0 }));
    const total = buckets.reduce((sum, b) => sum + b.value, 0);

    // Oldest open WOs
    const oldestWOs = await this.workOrderRepo.find({
      where: { tenantId, status: In(openStatuses) },
      order: { createdAt: 'ASC' },
      take: 10,
      relations: ['asset'],
    });

    const oldestDays = oldestWOs.length > 0
      ? Math.floor((now.getTime() - new Date(oldestWOs[0].createdAt).getTime()) / 86400000)
      : 0;

    return {
      buckets,
      total,
      oldestDays,
      details: oldestWOs.map((wo) => ({
        id: wo.id,
        woNumber: wo.woNumber,
        title: wo.title,
        status: wo.status,
        priority: wo.priority,
        asset: wo.asset?.name,
        createdAt: wo.createdAt,
        ageDays: Math.floor((now.getTime() - new Date(wo.createdAt).getTime()) / 86400000),
      })),
    };
  }

  // ==================== WARRANTY REPORT ====================

  async getWarrantyReport(withinDays: number, tenantId: string) {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + withinDays);

    const assets = await this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location')
      .where('asset.tenantId = :tenantId', { tenantId })
      .andWhere('asset.warrantyExpiry IS NOT NULL')
      .andWhere('asset.status != :retired', { retired: 'retired' })
      .orderBy('asset.warrantyExpiry', 'ASC')
      .getMany();

    return {
      expired: assets.filter((a) => new Date(a.warrantyExpiry) < now),
      expiringSoon: assets.filter(
        (a) => new Date(a.warrantyExpiry) >= now && new Date(a.warrantyExpiry) <= futureDate,
      ),
      active: assets.filter((a) => new Date(a.warrantyExpiry) > futureDate),
    };
  }
}
