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
      .andWhere('wo.completed_at <= :end', { end: budget.periodEnd })
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
      .leftJoin('wo.labor', 'labor')
      .leftJoin('wo.parts', 'parts')
      .select('COALESCE(SUM(labor.hours * labor.hourly_rate), 0)', 'laborCost')
      .addSelect('COALESCE(SUM(parts.qty_used * parts.unit_cost), 0)', 'partsCost')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completed_at >= :start', { start: budget.periodStart })
      .andWhere('wo.completed_at <= :end', { end: budget.periodEnd })
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
    const results = [];

    for (const budget of budgets) {
      const result = await this.workOrderRepository
        .createQueryBuilder('wo')
        .select('COALESCE(SUM(wo.actual_cost), 0)', 'totalCost')
        .where('wo.tenantId = :tenantId', { tenantId })
        .andWhere('wo.completed_at >= :start', { start: budget.periodStart })
        .andWhere('wo.completed_at <= :end', { end: budget.periodEnd })
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
    return summary
      .filter((s) => s.percentUsed >= 80)
      .map((s) => ({
        budgetId: s.budget.id,
        budgetName: s.budget.name,
        percentUsed: s.percentUsed,
      }));
  }
}
