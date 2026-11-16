import { format } from 'date-fns';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceBudget } from './entities/maintenance-budget.entity';
import { WorkOrder } from '../work-orders/entities/work-order.entity';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(MaintenanceBudget)
    private readonly budgetRepository: Repository<MaintenanceBudget>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
  ) {}

  async create(
    dto: {
      name: string;
      periodStart: Date;
      periodEnd: Date;
      locationId?: string;
      plannedAmount: number;
      allocatedCategories?: Record<string, number>;
    },
    tenantId: string,
  ): Promise<MaintenanceBudget> {
    const budget = this.budgetRepository.create({
      ...dto,
      tenantId,
    });
    return this.budgetRepository.save(budget);
  }

  async findAll(tenantId: string): Promise<MaintenanceBudget[]> {
    return this.budgetRepository.find({
      where: { tenantId },
      relations: ['location'],
      order: { periodStart: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<MaintenanceBudget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, tenantId },
      relations: ['location'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget ${id} not found`);
    }

    return budget;
  }

  async update(
    id: string,
    dto: Partial<{
      name: string;
      periodStart: Date;
      periodEnd: Date;
      locationId: string;
      plannedAmount: number;
      allocatedCategories: Record<string, number>;
    }>,
    tenantId: string,
  ): Promise<MaintenanceBudget> {
    const budget = await this.findOne(id, tenantId);
    Object.assign(budget, dto);
    return this.budgetRepository.save(budget);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const budget = await this.findOne(id, tenantId);
    await this.budgetRepository.remove(budget);
  }

  async getBudgetVsActual(
    budgetId: string,
    tenantId: string,
  ): Promise<{
    budget: MaintenanceBudget;
    actualSpend: number;
    laborCost: number;
    partsCost: number;
    variance: number;
    percentUsed: number;
  }> {
    const budget = await this.findOne(budgetId, tenantId);

    const result = await this.workOrderRepository
      .createQueryBuilder('wo')
      .select('COALESCE(SUM(wo.actual_cost), 0)', 'totalCost')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completed_at >= :start', { start: budget.periodStart })
      .andWhere("wo.completed_at < (CAST(:end AS date) + INTERVAL '1 day')", { end: budget.periodEnd })
      .andWhere(
        budget.locationId
          ? 'wo.location_id = :locationId'
          : '1=1',
        budget.locationId ? { locationId: budget.locationId } : {},
      )
      .getRawOne();

    const actualSpend = parseFloat(result?.totalCost || '0');
    const planned = Number(budget.plannedAmount);

    // Get labor vs parts breakdown
    const breakdown = await this.workOrderRepository
      .createQueryBuilder('wo')
      // Aggregate labour and parts in correlated subqueries. Joining both
      // tables at once produced a labour x parts cross product, multiplying
      // each total by the other's row count.
      .select(
        'COALESCE(SUM((SELECT COALESCE(SUM(l.hours * COALESCE(l.hourly_rate, 0)), 0) FROM wo_labor l WHERE l.wo_id = wo.id)), 0)',
        'laborCost',
      )
      .addSelect(
        'COALESCE(SUM((SELECT COALESCE(SUM(p.qty_used * COALESCE(p.unit_cost, 0)), 0) FROM wo_parts p WHERE p.wo_id = wo.id)), 0)',
        'partsCost',
      )
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completed_at >= :start', { start: budget.periodStart })
      .andWhere("wo.completed_at < (CAST(:end AS date) + INTERVAL '1 day')", { end: budget.periodEnd })
      .andWhere(
        budget.locationId
          ? 'wo.location_id = :locationId'
          : '1=1',
        budget.locationId ? { locationId: budget.locationId } : {},
      )
      .getRawOne();

    return {
      budget,
      actualSpend,
      laborCost: parseFloat(breakdown?.laborCost || '0'),
      partsCost: parseFloat(breakdown?.partsCost || '0'),
      variance: planned - actualSpend,
      percentUsed: planned > 0 ? Math.round((actualSpend / planned) * 10000) / 100 : 0,
    };
  }

  async getBudgetSummary(tenantId: string): Promise<
    Array<{
      budget: MaintenanceBudget;
      actualSpend: number;
      percentUsed: number;
    }>
  > {
    const budgets = await this.findAll(tenantId);
    const results: Array<{ budget: MaintenanceBudget; actualSpend: number; percentUsed: number }> = [];

    for (const budget of budgets) {
      const result = await this.workOrderRepository
        .createQueryBuilder('wo')
        .select('COALESCE(SUM(wo.actual_cost), 0)', 'totalCost')
        .where('wo.tenantId = :tenantId', { tenantId })
        .andWhere('wo.completed_at >= :start', { start: budget.periodStart })
        .andWhere("wo.completed_at < (CAST(:end AS date) + INTERVAL '1 day')", { end: budget.periodEnd })
        .andWhere(
          budget.locationId
            ? 'wo.location_id = :locationId'
            : '1=1',
          budget.locationId ? { locationId: budget.locationId } : {},
        )
        .getRawOne();

      const actualSpend = parseFloat(result?.totalCost || '0');
      const planned = Number(budget.plannedAmount);

      results.push({
        budget,
        actualSpend,
        percentUsed: planned > 0 ? Math.round((actualSpend / planned) * 10000) / 100 : 0,
      });
    }

    return results;
  }

  async checkBudgetThresholds(tenantId: string): Promise<
    Array<{ budgetId: string; budgetName: string; percentUsed: number }>
  > {
    const summary = await this.getBudgetSummary(tenantId);
    // Only alert on budgets whose period includes today; past budgets that
    // ended over-spent used to re-alert every day forever.
    // node-postgres parses DATE columns to a local-midnight Date, so compare
    // using local calendar fields (toISOString() could shift by a day).
    const dateOnly = (d: Date | string) => (typeof d === 'string' ? d.slice(0, 10) : format(d, 'yyyy-MM-dd'));
    const today = dateOnly(new Date());
    return summary
      .filter((s) => dateOnly(s.budget.periodStart) <= today && today <= dateOnly(s.budget.periodEnd))
      .filter((s) => s.percentUsed >= 80)
      .map((s) => ({
        budgetId: s.budget.id,
        budgetName: s.budget.name,
        percentUsed: s.percentUsed,
      }));
  }
}
