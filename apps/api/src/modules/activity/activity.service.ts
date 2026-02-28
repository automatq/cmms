import {
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

export interface QuickStartResult {
  activity: TechActivity;
  workOrder: WorkOrder;
  asset: any;
  isNewWorkOrder: boolean;
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

  /**
   * Quick-start: tech scans QR -> find or create WO -> mark IN_PROGRESS -> track activity
   */
  async quickStart(
    assetId: string,
    userId: string,
    tenantId: string,
  ): Promise<QuickStartResult> {
    // 1. Verify asset exists
    const asset = await this.assetsService.findOne(assetId, tenantId);

    // 2. Check if tech already has an ACTIVE activity on this asset (idempotent re-scan)
    const existingActivity = await this.activityRepository.findOne({
      where: { userId, assetId, tenantId, status: ActivityStatus.ACTIVE },
      relations: ['workOrder', 'asset'],
    });

    if (existingActivity) {
      const wo = await this.workOrdersService.findOne(
        existingActivity.workOrderId,
        tenantId,
      );
      return {
        activity: existingActivity,
        workOrder: wo,
        asset,
        isNewWorkOrder: false,
      };
    }

    // 3. Find existing OPEN or IN_PROGRESS WO assigned to this tech for this asset
    let workOrder = await this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.assetId = :assetId', { assetId })
      .andWhere('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...statuses)', {
        statuses: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS],
      })
      .andWhere(':userId = ANY(wo.assignedTo)', { userId })
      .orderBy('wo.createdAt', 'DESC')
      .getOne();

    let isNewWorkOrder = false;

    if (!workOrder) {
      // 4. No existing WO — create a new corrective WO
      workOrder = await this.workOrdersService.create(
        {
          title: `QR Scan: ${asset.name}`,
          description: `Quick-start work order created by QR scan on asset ${asset.assetNumber || asset.name}`,
          type: WorkOrderType.CORRECTIVE,
          assetId: asset.id,
          locationId: asset.location?.id || undefined,
          assignedTo: [userId],
        },
        userId,
        tenantId,
      );
      isNewWorkOrder = true;
    }

    // 5. Transition WO to IN_PROGRESS (DRAFT -> OPEN -> IN_PROGRESS)
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

    // 6. If WO is in progress but tech is not assigned, add them
    if (!workOrder.assignedTo?.includes(userId)) {
      workOrder.assignedTo = [...(workOrder.assignedTo || []), userId];
      await this.workOrderRepository.save(workOrder);
    }

    // 7. Create activity tracking record
    const activity = this.activityRepository.create({
      userId,
      assetId: asset.id,
      workOrderId: workOrder.id,
      tenantId,
      status: ActivityStatus.ACTIVE,
      startedAt: new Date(),
    });
    const savedActivity = await this.activityRepository.save(activity);

    // 8. Fetch full WO with relations
    const fullWo = await this.workOrdersService.findOne(workOrder.id, tenantId);

    // 9. Fetch user name for the event
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });
    const userName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
      : 'Unknown';

    // 10. Emit real-time event
    this.realtimeGateway.emitToTenant(tenantId, 'activity:started', {
      activityId: savedActivity.id,
      userId,
      userName,
      assetId: asset.id,
      assetName: asset.name,
      assetNumber: asset.assetNumber,
      workOrderId: fullWo.id,
      woNumber: fullWo.woNumber,
      startedAt: savedActivity.startedAt.toISOString(),
    });

    return {
      activity: savedActivity,
      workOrder: fullWo,
      asset,
      isNewWorkOrder,
    };
  }

  /**
   * Complete: tech finishes work on an asset
   */
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
    if (notes) activity.notes = notes;

    const saved = await this.activityRepository.save(activity);

    // Fetch user name
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });
    const userName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
      : 'Unknown';

    // Emit completion event
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

  /**
   * Get all active activities for a tenant (manager dashboard)
   */
  async getActiveActivities(tenantId: string): Promise<TechActivity[]> {
    return this.activityRepository.find({
      where: { tenantId, status: ActivityStatus.ACTIVE },
      relations: ['user', 'asset', 'workOrder'],
      order: { startedAt: 'DESC' },
    });
  }

  /**
   * Get current activity for a specific user
   */
  async getMyActiveActivity(
    userId: string,
    tenantId: string,
  ): Promise<TechActivity | null> {
    return this.activityRepository.findOne({
      where: { userId, tenantId, status: ActivityStatus.ACTIVE },
      relations: ['asset', 'workOrder'],
    });
  }
}
