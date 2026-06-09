import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay } from 'date-fns';
import { PmPlan, TriggerType, FrequencyUnit, ChecklistTemplate, PmHistory, PmHistoryStatus, SensorReading } from './entities';
import {
  CreatePmPlanDto,
  UpdatePmPlanDto,
  PmQueryDto,
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  IngestSensorReadingDto,
} from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { WorkOrderType, Priority } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SEED_TEMPLATES, SeedTemplate } from './data/seed-templates';
import { BlackoutsService } from '../blackouts/blackouts.service';
import { evalCondition } from './condition.util';

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
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(SensorReading)
    private readonly sensorReadingRepository: Repository<SensorReading>,
    @Inject(forwardRef(() => WorkOrdersService))
    private readonly workOrdersService: WorkOrdersService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService,
    private readonly blackoutsService: BlackoutsService,
    @InjectQueue('pm-scheduler')
    private readonly pmQueue: Queue,
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
    plan.nextDueAt = await this.calculateNextDueDate(plan, tenantId);
    await this.pmPlanRepository.save(plan);

    try {
      await this.webhooksService.trigger('pm.triggered', {
        pmPlanId: plan.id,
        pmPlanName: plan.name,
        workOrderId: workOrder.id,
        assetId: plan.assetId,
      }, tenantId);
    } catch (err) {
      this.logger.warn(`webhook pm.triggered failed for plan ${plan.id}: ${(err as Error).message}`);
    }

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

    // Group by tenantId so each tenant is processed independently.
    const plansByTenant = new Map<string, PmPlan[]>();
    for (const plan of duePlans) {
      const existing = plansByTenant.get(plan.tenantId) || [];
      existing.push(plan);
      plansByTenant.set(plan.tenantId, existing);
    }

    for (const [tenantId, plans] of plansByTenant) {
      for (const plan of plans) {
        try {
          // Skip PMs whose next-due landed in a blackout — roll forward instead of creating a WO.
          if (!plan.ignoreBlackouts && await this.blackoutsService.isBlackout(now, tenantId)) {
            plan.nextDueAt = await this.blackoutsService.nextWorkingDay(now, tenantId);
            await this.pmPlanRepository.save(plan);
            skipped++;
            continue;
          }

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
          plan.nextDueAt = await this.calculateNextDueDate(plan, tenantId);
          await this.pmPlanRepository.save(plan);

          try {
            await this.webhooksService.trigger('pm.triggered', {
              pmPlanId: plan.id,
              pmPlanName: plan.name,
              workOrderId: workOrder.id,
              assetId: plan.assetId,
            }, tenantId);
          } catch (err) {
            this.logger.warn(`webhook pm.triggered failed for plan ${plan.id}: ${(err as Error).message}`);
          }

          try {
            await this.notificationsService.onPmDue(
              { id: plan.id, name: plan.name, assetId: plan.assetId },
              plan.assignedTo ?? [],
              tenantId,
            );
          } catch (err) {
            this.logger.warn(`notification onPmDue failed for plan ${plan.id}: ${(err as Error).message}`);
          }

          triggered++;
        } catch (error) {
          this.logger.error(`Failed to trigger PM ${plan.id}:`, error);
          skipped++;
        }
      }
    }

    return { triggered, skipped };
  }

  /**
   * Meter-based PM auto-generation (Worker, hourly).
   *
   * For every active meter-triggered plan, compares the asset's current meter
   * value against the plan's last recorded reading + interval. The first time a
   * plan is seen, its baseline (`lastMeterReading`) is initialized from the
   * asset's current value so future intervals are measured from a known point —
   * without this, a null baseline means a plan can never trigger.
   *
   * Runs on a schedule (rather than synchronously on each meter reading) to
   * avoid an AssetsModule → PmModule → WorkOrdersModule → AssetsModule cycle;
   * meter PM intervals are coarse enough that hourly polling is sufficient.
   */
  async processMeterPms(): Promise<{ triggered: number; initialized: number; skipped: number }> {
    let triggered = 0;
    let initialized = 0;
    let skipped = 0;

    const plans = await this.pmPlanRepository.find({
      where: {
        isActive: true,
        triggerType: TriggerType.METER,
      },
    });

    for (const plan of plans) {
      try {
        const interval = Number(plan.meterInterval);
        if (!interval || interval <= 0) {
          skipped++;
          continue;
        }

        const asset = await this.assetRepository.findOne({
          where: { id: plan.assetId, tenantId: plan.tenantId },
        });
        if (!asset) {
          skipped++;
          continue;
        }

        const currentReading = Number(asset.currentMeterValue ?? 0);

        // First observation: anchor the baseline so future intervals are measured from here.
        if (plan.lastMeterReading === null || plan.lastMeterReading === undefined) {
          plan.lastMeterReading = currentReading;
          await this.pmPlanRepository.save(plan);
          initialized++;
          continue;
        }

        const lastReading = Number(plan.lastMeterReading);
        if (currentReading < lastReading + interval) {
          skipped++;
          continue;
        }

        // Don't stack a second WO while one for this plan is still open.
        const existingWo = await this.workOrdersService.findAll({
          page: 1,
          limit: 1,
          pmPlanId: plan.id,
          status: ['open', 'in_progress', 'on_hold'] as any,
        }, plan.tenantId);

        if (existingWo.total > 0) {
          skipped++;
          continue;
        }

        const workOrder = await this.workOrdersService.create(
          {
            title: `PM: ${plan.name}`,
            description: `Meter-triggered PM at ${currentReading} ${plan.meterUnit || 'units'}`,
            type: WorkOrderType.PREVENTIVE,
            priority: plan.priority as Priority,
            assetId: plan.assetId,
            pmPlanId: plan.id,
            checklistTemplateId: plan.checklistTemplateId,
          },
          'system',
          plan.tenantId,
        );

        await this.historyRepository.save({
          pmPlanId: plan.id,
          tenantId: plan.tenantId,
          woId: workOrder.id,
          dueAt: new Date(),
        });

        plan.lastMeterReading = currentReading;
        plan.lastTriggeredAt = new Date();
        await this.pmPlanRepository.save(plan);

        try {
          await this.webhooksService.trigger('pm.triggered', {
            pmPlanId: plan.id,
            pmPlanName: plan.name,
            workOrderId: workOrder.id,
            assetId: plan.assetId,
          }, plan.tenantId);
        } catch (err) {
          this.logger.warn(`webhook pm.triggered failed for meter plan ${plan.id}: ${(err as Error).message}`);
        }

        try {
          await this.notificationsService.onPmDue(
            { id: plan.id, name: plan.name, assetId: plan.assetId },
            plan.assignedTo ?? [],
            plan.tenantId,
          );
        } catch (err) {
          this.logger.warn(`notification onPmDue failed for meter plan ${plan.id}: ${(err as Error).message}`);
        }

        triggered++;
      } catch (error) {
        this.logger.error(`Failed to trigger meter PM ${plan.id}:`, error);
        skipped++;
      }
    }

    return { triggered, initialized, skipped };
  }

  // ==================== CONDITION-BASED MAINTENANCE ====================

  /**
   * Ingest a sensor reading for an asset, then evaluate any CONDITION-trigger PM
   * plans for that (asset, metric) against their thresholds — auto-creating a
   * work order on breach. Gated behind the tenant's `sensors` module.
   */
  async ingestSensorReading(
    dto: IngestSensorReadingDto,
    tenantId: string,
  ): Promise<{ readingId: string; triggered: boolean; workOrderId?: string }> {
    const asset = await this.assetRepository.findOne({
      where: { id: dto.assetId, tenantId },
    });
    if (!asset) {
      throw new NotFoundException(`Asset ${dto.assetId} not found`);
    }

    const reading = await this.sensorReadingRepository.save(
      this.sensorReadingRepository.create({
        assetId: dto.assetId,
        metric: dto.metric,
        value: dto.value,
        unit: dto.unit,
        source: dto.source,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        tenantId,
      }),
    );

    const result = await this.evaluateConditionPlans(
      dto.assetId,
      dto.metric,
      Number(dto.value),
      dto.unit,
      tenantId,
    );

    return { readingId: reading.id, ...result };
  }

  /** Find CONDITION plans for (asset, metric), evaluate, and trigger on breach. */
  private async evaluateConditionPlans(
    assetId: string,
    metric: string,
    value: number,
    unit: string | undefined,
    tenantId: string,
  ): Promise<{ triggered: boolean; workOrderId?: string }> {
    const plans = await this.pmPlanRepository.find({
      where: { isActive: true, triggerType: TriggerType.CONDITION, assetId, tenantId },
    });

    for (const plan of plans) {
      const cond = (plan.metadata as any)?.condition;
      if (!cond || cond.metric !== metric) continue;

      const { breached, severity } = evalCondition(value, cond);
      if (!breached) continue;

      // Debounce: don't re-trigger within the configured window.
      const debounceMs = Number(cond.debounceMinutes || 0) * 60 * 1000;
      if (debounceMs > 0 && plan.lastTriggeredAt && Date.now() - new Date(plan.lastTriggeredAt).getTime() < debounceMs) {
        continue;
      }

      // Don't stack a second WO while one for this plan is still open.
      const existingWo = await this.workOrdersService.findAll(
        { page: 1, limit: 1, pmPlanId: plan.id, status: ['open', 'in_progress', 'on_hold'] as any },
        tenantId,
      );
      if (existingWo.total > 0) continue;

      const woId = await this.triggerConditionWo(plan, metric, value, unit, severity);
      if (woId) return { triggered: true, workOrderId: woId };
    }

    return { triggered: false };
  }

  /** Create the work order + history + notifications for a breached condition plan. */
  private async triggerConditionWo(
    plan: PmPlan,
    metric: string,
    value: number,
    unit: string | undefined,
    severity: 'warning' | 'critical' | null,
  ): Promise<string | null> {
    try {
      const priority = severity === 'critical' ? Priority.HIGH : (plan.priority as Priority);
      const workOrder = await this.workOrdersService.create(
        {
          title: `Condition alert: ${plan.name}`,
          description: `${metric} = ${value}${unit ? ` ${unit}` : ''} crossed ${severity || 'threshold'} threshold`,
          type: WorkOrderType.CORRECTIVE,
          priority,
          assetId: plan.assetId,
          pmPlanId: plan.id,
          checklistTemplateId: plan.checklistTemplateId,
        },
        'system',
        plan.tenantId,
      );

      await this.historyRepository.save({
        pmPlanId: plan.id,
        tenantId: plan.tenantId,
        woId: workOrder.id,
        dueAt: new Date(),
      });

      plan.lastTriggeredAt = new Date();
      await this.pmPlanRepository.save(plan);

      try {
        await this.webhooksService.trigger('pm.triggered', {
          pmPlanId: plan.id,
          pmPlanName: plan.name,
          workOrderId: workOrder.id,
          assetId: plan.assetId,
          trigger: 'condition',
        }, plan.tenantId);
      } catch (err) {
        this.logger.warn(`webhook pm.triggered failed for condition plan ${plan.id}: ${(err as Error).message}`);
      }

      try {
        await this.notificationsService.onPmDue(
          { id: plan.id, name: plan.name, assetId: plan.assetId },
          plan.assignedTo ?? [],
          plan.tenantId,
        );
      } catch (err) {
        this.logger.warn(`notification onPmDue failed for condition plan ${plan.id}: ${(err as Error).message}`);
      }

      return workOrder.id;
    } catch (error) {
      this.logger.error(`Failed to trigger condition PM ${plan.id}:`, error);
      return null;
    }
  }

  /**
   * Backstop sweep: re-evaluate every active CONDITION plan against the latest
   * reading for its metric. Ingestion evaluates inline, so this only catches
   * plans created/edited after a reading already arrived.
   */
  async processConditionPms(): Promise<{ triggered: number; skipped: number }> {
    let triggered = 0;
    let skipped = 0;

    const plans = await this.pmPlanRepository.find({
      where: { isActive: true, triggerType: TriggerType.CONDITION },
    });

    for (const plan of plans) {
      const cond = (plan.metadata as any)?.condition;
      if (!cond || !cond.metric || !plan.assetId) {
        skipped++;
        continue;
      }

      const latest = await this.sensorReadingRepository.findOne({
        where: { assetId: plan.assetId, metric: cond.metric, tenantId: plan.tenantId },
        order: { recordedAt: 'DESC' },
      });
      if (!latest) {
        skipped++;
        continue;
      }

      const result = await this.evaluateConditionPlans(
        plan.assetId,
        cond.metric,
        Number(latest.value),
        latest.unit,
        plan.tenantId,
      );
      if (result.triggered) triggered++;
      else skipped++;
    }

    return { triggered, skipped };
  }

  /** Recent sensor readings for an asset (optionally filtered by metric). */
  async getSensorReadings(
    assetId: string,
    tenantId: string,
    metric?: string,
    limit = 100,
  ): Promise<SensorReading[]> {
    return this.sensorReadingRepository.find({
      where: { assetId, tenantId, ...(metric ? { metric } : {}) },
      order: { recordedAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  private async calculateNextDueDate(plan: PmPlan, tenantId: string): Promise<Date> {
    const baseDate = plan.rollingSchedule
      ? new Date()
      : plan.nextDueAt || new Date();

    let next: Date;
    if (plan.triggerType === TriggerType.TIME && plan.frequencyValue && plan.frequencyUnit) {
      switch (plan.frequencyUnit) {
        case FrequencyUnit.DAY:
          next = addDays(baseDate, plan.frequencyValue);
          break;
        case FrequencyUnit.WEEK:
          next = addWeeks(baseDate, plan.frequencyValue);
          break;
        case FrequencyUnit.MONTH:
          next = addMonths(baseDate, plan.frequencyValue);
          break;
        case FrequencyUnit.YEAR:
          next = addYears(baseDate, plan.frequencyValue);
          break;
        default:
          next = addDays(baseDate, 30);
      }
    } else {
      next = addDays(baseDate, 30);
    }

    if (plan.ignoreBlackouts) return next;
    return this.blackoutsService.nextWorkingDay(next, tenantId);
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
