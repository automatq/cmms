import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay } from 'date-fns';
import { PmPlan, TriggerType, FrequencyUnit, ChecklistTemplate, PmHistory, PmHistoryStatus } from './entities';
import {
  CreatePmPlanDto,
  UpdatePmPlanDto,
  PmQueryDto,
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
} from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { WorkOrderType, Priority } from '../work-orders/entities/work-order.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SEED_TEMPLATES, SeedTemplate } from './data/seed-templates';

@Injectable()
export class PmService {
  private readonly logger = new Logger(PmService.name);

  constructor(
    @InjectRepository(PmPlan)
    private readonly pmPlanRepository: Repository<PmPlan>,
    @InjectRepository(ChecklistTemplate)
    private readonly templateRepository: Repository<ChecklistTemplate>,
    @InjectRepository(PmHistory)
    private readonly historyRepository: Repository<PmHistory>,
    @Inject(forwardRef(() => WorkOrdersService))
    private readonly workOrdersService: WorkOrdersService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService,
    @InjectQueue('pm-scheduler')
    private readonly pmQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== PM PLAN CRUD ====================

  async create(dto: CreatePmPlanDto, tenantId: string): Promise<PmPlan> {
    const plan = this.pmPlanRepository.create({
      ...dto,
      tenantId,
      nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
    });

    const savedPlan = await this.pmPlanRepository.save(plan);
    return Array.isArray(savedPlan) ? savedPlan[0] : savedPlan;
  }

  async findAll(query: PmQueryDto, tenantId: string): Promise<PaginatedResult<PmPlan>> {
    const { page, limit, search, triggerType, assetId, isActive } = query;

    const queryBuilder = this.pmPlanRepository
      .createQueryBuilder('pm')
      .leftJoinAndSelect('pm.asset', 'asset');

    queryBuilder.andWhere('pm.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere('pm.name ILIKE :search', { search: `%${search}%` });
    }

    if (triggerType) {
      queryBuilder.andWhere('pm.triggerType = :triggerType', { triggerType });
    }

    if (assetId) {
      queryBuilder.andWhere('pm.assetId = :assetId', { assetId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('pm.isActive = :isActive', { isActive });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('pm.nextDueAt', 'ASC')
      .getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string): Promise<PmPlan> {
    const plan = await this.pmPlanRepository.findOne({
      where: { id, tenantId },
      relations: ['asset'],
    });

    if (!plan) {
      throw new NotFoundException(`PM Plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: string, dto: UpdatePmPlanDto, tenantId: string): Promise<PmPlan> {
    const plan = await this.findOne(id, tenantId);

    if (dto.nextDueAt) {
      dto.nextDueAt = new Date(dto.nextDueAt).toISOString();
    }

    Object.assign(plan, dto);
    return this.pmPlanRepository.save(plan);
  }

  async toggleActive(id: string, tenantId: string): Promise<PmPlan> {
    const plan = await this.findOne(id, tenantId);
    plan.isActive = !plan.isActive;
    return this.pmPlanRepository.save(plan);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const plan = await this.findOne(id, tenantId);
    await this.pmPlanRepository.remove(plan);
  }

  // ==================== SCHEDULING ====================

  async getDueToday(tenantId: string): Promise<PmPlan[]> {
    const today = new Date();
    return this.pmPlanRepository.find({
      where: {
        tenantId,
        isActive: true,
        nextDueAt: Between(startOfDay(today), endOfDay(today)),
      },
      relations: ['asset'],
    });
  }

  async getDueThisWeek(tenantId: string): Promise<PmPlan[]> {
    const today = new Date();
    const weekEnd = addDays(today, 7);
    return this.pmPlanRepository.find({
      where: {
        tenantId,
        isActive: true,
        nextDueAt: Between(startOfDay(today), endOfDay(weekEnd)),
      },
      relations: ['asset'],
      order: { nextDueAt: 'ASC' },
    });
  }

  async getOverdue(tenantId: string): Promise<PmPlan[]> {
    const today = new Date();
    return this.pmPlanRepository.find({
      where: {
        tenantId,
        isActive: true,
        nextDueAt: LessThanOrEqual(startOfDay(today)),
      },
      relations: ['asset'],
      order: { nextDueAt: 'ASC' },
    });
  }

  // ==================== TRIGGER ====================

  async triggerNow(id: string, userId: string, tenantId: string): Promise<{ woId: string }> {
    const plan = await this.findOne(id, tenantId);

    // Create work order from PM plan
    const workOrder = await this.workOrdersService.create(
      {
        title: `PM: ${plan.name}`,
        description: plan.description,
        type: WorkOrderType.PREVENTIVE,
        priority: plan.priority as Priority,
        assetId: plan.assetId,
        assignedTo: plan.assignedTo,
        estimatedHours: plan.estimatedHours,
        pmPlanId: plan.id,
        checklistTemplateId: plan.checklistTemplateId,
      },
      userId,
      tenantId,
    );

    // Record history
    await this.historyRepository.save({
      pmPlanId: plan.id,
      woId: workOrder.id,
      tenantId,
      dueAt: plan.nextDueAt || new Date(),
    });

    // Update plan
    plan.lastTriggeredAt = new Date();
    plan.nextDueAt = this.calculateNextDueDate(plan);
    await this.pmPlanRepository.save(plan);

    // Notify assigned users
    await this.notificationsService.onPmDue(plan, plan.assignedTo, tenantId);

    try {
      await this.webhooksService.trigger('pm.triggered', {
        pmPlanId: plan.id,
        pmPlanName: plan.name,
        workOrderId: workOrder.id,
        assetId: plan.assetId,
      }, tenantId);
    } catch {}

    return { woId: workOrder.id };
  }

  // ==================== AUTO-GENERATION (Worker) ====================

  async processScheduledPMs(): Promise<{ triggered: number; skipped: number }> {
    const now = new Date();
    let triggered = 0;
    let skipped = 0;

    // Find all active PM plans due for triggering
    const duePlans = await this.pmPlanRepository.find({
      where: {
        isActive: true,
        nextDueAt: LessThanOrEqual(now),
      },
    });

    // Group by tenantId for proper RLS context
    const plansByTenant = new Map<string, PmPlan[]>();
    for (const plan of duePlans) {
      const existing = plansByTenant.get(plan.tenantId) || [];
      existing.push(plan);
      plansByTenant.set(plan.tenantId, existing);
    }

    for (const [tenantId, plans] of plansByTenant) {
      // Set RLS context for this tenant
      await this.dataSource.query(
        `SELECT set_config('app.current_tenant_id', $1, false)`,
        [tenantId],
      );

      for (const plan of plans) {
        try {
          // Check if we already have an open WO for this PM
          const existingWo = await this.workOrdersService.findAll({
            page: 1,
            limit: 1,
            pmPlanId: plan.id,
            status: ['open', 'in_progress', 'on_hold'] as any,
          }, tenantId);

          if (existingWo.total > 0) {
            skipped++;
            continue;
          }

          // Create work order
          const workOrder = await this.workOrdersService.create(
            {
              title: `PM: ${plan.name}`,
              description: plan.description,
              type: WorkOrderType.PREVENTIVE,
              priority: plan.priority as Priority,
              assetId: plan.assetId,
              assignedTo: plan.assignedTo,
              estimatedHours: plan.estimatedHours,
              pmPlanId: plan.id,
              checklistTemplateId: plan.checklistTemplateId,
            },
            'system',
            tenantId,
          );

          // Record history
          await this.historyRepository.save({
            pmPlanId: plan.id,
            tenantId,
            woId: workOrder.id,
            dueAt: plan.nextDueAt,
          });

          // Update next due date
          plan.lastTriggeredAt = new Date();
          plan.nextDueAt = this.calculateNextDueDate(plan);
          await this.pmPlanRepository.save(plan);

          // Notify
          await this.notificationsService.onPmDue(plan, plan.assignedTo, tenantId);

          try {
            await this.webhooksService.trigger('pm.triggered', {
              pmPlanId: plan.id,
              pmPlanName: plan.name,
              workOrderId: workOrder.id,
              assetId: plan.assetId,
            }, tenantId);
          } catch {}

          triggered++;
        } catch (error) {
          this.logger.error(`Failed to trigger PM ${plan.id}:`, error);
          skipped++;
        }
      }
    }

    // Clear RLS context
    await this.dataSource.query(
      `SELECT set_config('app.current_tenant_id', '', false)`,
    );

    return { triggered, skipped };
  }

  async checkMeterTriggers(assetId: string, newReading: number, tenantId: string): Promise<string[]> {
    const createdWoIds: string[] = [];

    // Find meter-based PM plans for this asset
    const plans = await this.pmPlanRepository.find({
      where: {
        assetId,
        tenantId,
        triggerType: TriggerType.METER,
        isActive: true,
      },
    });

    for (const plan of plans) {
      if (!plan.meterInterval || !plan.lastMeterReading) continue;

      const nextTriggerAt = plan.lastMeterReading + plan.meterInterval;
      if (newReading >= nextTriggerAt) {
        const workOrder = await this.workOrdersService.create(
          {
            title: `PM: ${plan.name}`,
            description: `Meter-triggered PM at ${newReading} ${plan.meterUnit || 'units'}`,
            type: WorkOrderType.PREVENTIVE,
            priority: plan.priority as Priority,
            assetId: plan.assetId,
            assignedTo: plan.assignedTo,
            estimatedHours: plan.estimatedHours,
            pmPlanId: plan.id,
            checklistTemplateId: plan.checklistTemplateId,
          },
          'system',
          tenantId,
        );

        plan.lastMeterReading = newReading;
        plan.lastTriggeredAt = new Date();
        await this.pmPlanRepository.save(plan);

        createdWoIds.push(workOrder.id);
      }
    }

    return createdWoIds;
  }

  private calculateNextDueDate(plan: PmPlan): Date {
    const baseDate = plan.rollingSchedule
      ? new Date()
      : plan.nextDueAt || new Date();

    if (plan.triggerType === TriggerType.TIME && plan.frequencyValue && plan.frequencyUnit) {
      switch (plan.frequencyUnit) {
        case FrequencyUnit.DAY:
          return addDays(baseDate, plan.frequencyValue);
        case FrequencyUnit.WEEK:
          return addWeeks(baseDate, plan.frequencyValue);
        case FrequencyUnit.MONTH:
          return addMonths(baseDate, plan.frequencyValue);
        case FrequencyUnit.YEAR:
          return addYears(baseDate, plan.frequencyValue);
      }
    }

    // Default: add 30 days
    return addDays(baseDate, 30);
  }

  // ==================== CHECKLIST TEMPLATES ====================

  async createTemplate(dto: CreateChecklistTemplateDto, tenantId: string): Promise<ChecklistTemplate> {
    const template = this.templateRepository.create({ ...dto, tenantId });
    return this.templateRepository.save(template);
  }

  async findAllTemplates(tenantId: string): Promise<ChecklistTemplate[]> {
    return this.templateRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOneTemplate(id: string, tenantId: string): Promise<ChecklistTemplate> {
    const template = await this.templateRepository.findOne({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundException(`Checklist template with ID ${id} not found`);
    }
    return template;
  }

  async updateTemplate(id: string, dto: UpdateChecklistTemplateDto, tenantId: string): Promise<ChecklistTemplate> {
    const template = await this.findOneTemplate(id, tenantId);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    const template = await this.findOneTemplate(id, tenantId);
    await this.templateRepository.remove(template);
  }

  // ==================== TEMPLATE LIBRARY ====================

  async getLibraryTemplates(): Promise<SeedTemplate[]> {
    return SEED_TEMPLATES;
  }

  async importLibraryTemplate(index: number, tenantId: string): Promise<ChecklistTemplate> {
    if (index < 0 || index >= SEED_TEMPLATES.length) {
      throw new NotFoundException('Library template not found');
    }

    const seed = SEED_TEMPLATES[index];
    const template = this.templateRepository.create({
      name: seed.name,
      description: seed.description,
      category: seed.category,
      items: seed.items,
      isLibrary: false,
      tenantId,
    });

    return this.templateRepository.save(template);
  }

  // ==================== PM COMPLIANCE ====================

  async getComplianceRate(from: Date, to: Date, tenantId: string): Promise<number> {
    const history = await this.historyRepository.find({
      where: {
        tenantId,
        triggeredAt: Between(from, to),
      },
    });

    if (history.length === 0) return 100;

    const onTime = history.filter((h) => h.status === PmHistoryStatus.ON_TIME).length;
    return Math.round((onTime / history.length) * 100);
  }

  async getHistory(pmPlanId: string, tenantId: string): Promise<PmHistory[]> {
    return this.historyRepository.find({
      where: { pmPlanId, tenantId },
      order: { triggeredAt: 'DESC' },
      take: 50,
    });
  }
}
