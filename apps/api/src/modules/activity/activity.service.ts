import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechActivity, ActivityStatus } from './entities/tech-activity.entity';
import {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
} from '../work-orders/entities/work-order.entity';
import { User } from '../users/entities/user.entity';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { AssetsService } from '../assets/assets.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Asset, AssetStatus } from '../assets/entities';

export interface QuickStartResult {
  activity: TechActivity;
  workOrder: WorkOrder;
  asset: Asset;
  isNewWorkOrder: boolean;
  scanSource: 'asset_id' | 'qr_token';
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(TechActivity)
    private readonly activityRepository: Repository<TechActivity>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly workOrdersService: WorkOrdersService,
    private readonly assetsService: AssetsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private async getUserDisplayName(userId: string, tenantId: string): Promise<string> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('members', 'm', 'm.user_id = user.id AND m.organization_id = :tenantId', { tenantId })
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      return 'Unknown';
    }

    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email;
  }

  private async getActiveSession(userId: string, tenantId: string): Promise<TechActivity | null> {
    return this.activityRepository.findOne({
      where: { userId, tenantId, status: ActivityStatus.ACTIVE },
      relations: ['asset', 'workOrder'],
      order: { startedAt: 'DESC' },
    });
  }

  private ensureAssetIsWorkable(asset: Asset) {
    if (asset.status === AssetStatus.RETIRED) {
      throw new ConflictException({
        code: 'ASSET_RETIRED',
        message: 'This asset is retired or out of service',
        asset: {
          id: asset.id,
          name: asset.name,
          assetNumber: asset.assetNumber,
          status: asset.status,
          location: asset.location?.name || null,
        },
      });
    }
  }

  private async buildActiveSessionConflict(
    activity: TechActivity,
    tenantId: string,
  ): Promise<Record<string, unknown>> {
    const workOrder =
      activity.workOrder || (await this.workOrdersService.findOne(activity.workOrderId, tenantId));

    return {
      code: 'ACTIVE_SESSION_EXISTS',
      message: 'You already have an active timed work session on another asset',
      activeActivity: activity,
      activeWorkOrder: workOrder,
      activeAsset: activity.asset,
    };
  }

  private async emitStartedEvent(
    tenantId: string,
    userId: string,
    activity: TechActivity,
    asset: Asset,
    workOrder: WorkOrder,
  ): Promise<void> {
    const userName = await this.getUserDisplayName(userId, tenantId);
    this.realtimeGateway.emitToTenant(tenantId, 'activity:started', {
      activityId: activity.id,
      userId,
      userName,
      assetId: asset.id,
      assetName: asset.name,
      assetNumber: asset.assetNumber,
      workOrderId: workOrder.id,
      woNumber: workOrder.woNumber,
      startedAt: activity.startedAt.toISOString(),
    });
  }

  private async quickStartForAsset(
    asset: Asset,
    userId: string,
    tenantId: string,
    scanSource: 'asset_id' | 'qr_token',
  ): Promise<QuickStartResult> {
    this.ensureAssetIsWorkable(asset);

    const existingActiveSession = await this.getActiveSession(userId, tenantId);
    if (existingActiveSession) {
      if (existingActiveSession.assetId === asset.id) {
        return {
          activity: existingActiveSession,
          workOrder: await this.workOrdersService.findOne(
            existingActiveSession.workOrderId,
            tenantId,
          ),
          asset,
          isNewWorkOrder: false,
          scanSource,
        };
      }

      throw new ConflictException(
        await this.buildActiveSessionConflict(existingActiveSession, tenantId),
      );
    }

    let workOrder = await this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.assetId = :assetId', { assetId: asset.id })
      .andWhere('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...statuses)', {
        statuses: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.OPEN],
      })
      .andWhere('wo.createdById = :userId', { userId })
      .orderBy(
        `CASE WHEN wo.status = '${WorkOrderStatus.IN_PROGRESS}' THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('wo.createdAt', 'DESC')
      .getOne();

    let isNewWorkOrder = false;

    if (!workOrder) {
      workOrder = await this.workOrdersService.create(
        {
          title: `QR Scan: ${asset.name}`,
          description: `Quick-start work order created by QR scan on asset ${asset.assetNumber || asset.name}`,
          type: WorkOrderType.CORRECTIVE,
          assetId: asset.id,
          locationId: asset.location?.id || undefined,
        },
        userId,
        tenantId,
      );
      isNewWorkOrder = true;
    }

    if (workOrder.status === WorkOrderStatus.DRAFT) {
      workOrder = await this.workOrdersService.updateStatus(
        workOrder.id,
        WorkOrderStatus.OPEN,
        userId,
        tenantId,
      );
    }

    if (workOrder.status === WorkOrderStatus.OPEN) {
      workOrder = await this.workOrdersService.updateStatus(
        workOrder.id,
        WorkOrderStatus.IN_PROGRESS,
        userId,
        tenantId,
      );
    }

    const activity = this.activityRepository.create({
      userId,
      assetId: asset.id,
      workOrderId: workOrder.id,
      tenantId,
      status: ActivityStatus.ACTIVE,
      startedAt: new Date(),
    });
    const savedActivity = await this.activityRepository.save(activity);
    const fullWorkOrder = await this.workOrdersService.findOne(workOrder.id, tenantId);

    await this.emitStartedEvent(tenantId, userId, savedActivity, asset, fullWorkOrder);

    return {
      activity: savedActivity,
      workOrder: fullWorkOrder,
      asset,
      isNewWorkOrder,
      scanSource,
    };
  }

  async quickStart(
    assetId: string,
    userId: string,
    tenantId: string,
  ): Promise<QuickStartResult> {
    const asset = await this.assetsService.findOne(assetId, tenantId);
    return this.quickStartForAsset(asset, userId, tenantId, 'asset_id');
  }

  async quickStartByQr(
    token: string,
    userId: string,
    tenantId: string,
  ): Promise<QuickStartResult> {
    const resolved = await this.assetsService.resolveAssetTagToken(token, tenantId);
    const asset = await this.assetsService.findOne(resolved.id, tenantId);
    return this.quickStartForAsset(asset, userId, tenantId, 'qr_token');
  }

  async completeActivity(
    activityId: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<TechActivity> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, userId, tenantId, status: ActivityStatus.ACTIVE },
      relations: ['asset', 'workOrder'],
    });

    if (!activity) {
      throw new NotFoundException('Active activity session not found');
    }

    const now = new Date();
    activity.status = ActivityStatus.COMPLETED;
    activity.completedAt = now;
    activity.durationMinutes = Math.round(
      (now.getTime() - activity.startedAt.getTime()) / (1000 * 60),
    );
    if (notes) {
      activity.notes = notes;
    }

    const saved = await this.activityRepository.save(activity);
    const userName = await this.getUserDisplayName(userId, tenantId);

    this.realtimeGateway.emitToTenant(tenantId, 'activity:completed', {
      activityId: saved.id,
      userId,
      userName,
      assetId: activity.assetId,
      assetName: activity.asset?.name,
      workOrderId: activity.workOrderId,
      woNumber: activity.workOrder?.woNumber,
      startedAt: activity.startedAt.toISOString(),
      completedAt: now.toISOString(),
      durationMinutes: saved.durationMinutes,
    });

    return saved;
  }

  async abandonActivity(
    activityId: string,
    userId: string,
    tenantId: string,
    reason?: string,
  ): Promise<TechActivity> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, userId, tenantId, status: ActivityStatus.ACTIVE },
      relations: ['asset', 'workOrder'],
    });

    if (!activity) {
      throw new NotFoundException('Active activity session not found');
    }

    const now = new Date();
    activity.status = ActivityStatus.ABANDONED;
    activity.abandonedAt = now;
    activity.durationMinutes = Math.round(
      (now.getTime() - activity.startedAt.getTime()) / (1000 * 60),
    );
    if (reason) {
      activity.abandonReason = reason;
    }

    const saved = await this.activityRepository.save(activity);
    const userName = await this.getUserDisplayName(userId, tenantId);

    this.realtimeGateway.emitToTenant(tenantId, 'activity:abandoned', {
      activityId: saved.id,
      userId,
      userName,
      assetId: activity.assetId,
      assetName: activity.asset?.name,
      workOrderId: activity.workOrderId,
      woNumber: activity.workOrder?.woNumber,
      startedAt: activity.startedAt.toISOString(),
      abandonedAt: now.toISOString(),
      durationMinutes: saved.durationMinutes,
      abandonReason: saved.abandonReason || null,
    });

    return saved;
  }

  async getActiveActivities(tenantId: string): Promise<TechActivity[]> {
    return this.activityRepository
      .createQueryBuilder('ta')
      .innerJoinAndSelect('ta.user', 'user')
      .innerJoinAndSelect('ta.asset', 'asset')
      .innerJoinAndSelect('ta.workOrder', 'workOrder')
      .innerJoin(
        'members',
        'm',
        'm.user_id = user.id AND m.organization_id = :tenantId',
        { tenantId },
      )
      .where('ta.tenantId = :tenantId', { tenantId })
      .andWhere('ta.status = :status', { status: ActivityStatus.ACTIVE })
      .orderBy('ta.startedAt', 'DESC')
      .getMany();
  }

  async getMyActiveActivity(
    userId: string,
    tenantId: string,
  ): Promise<TechActivity | null> {
    return this.activityRepository.findOne({
      where: { userId, tenantId, status: ActivityStatus.ACTIVE },
      relations: ['asset', 'workOrder'],
      order: { startedAt: 'DESC' },
    });
  }
}
