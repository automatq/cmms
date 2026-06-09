import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
  WoLabor,
  WoPart,
  WoAttachment,
  WoChecklistResult,
  WoComment,
  WorkRequest,
  WorkRequestStatus,
  WoAssignee,
} from './entities';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  WorkOrderQueryDto,
  UpdateStatusDto,
  AddLaborDto,
  AddPartDto,
  CreateCommentDto,
  SaveChecklistDto,
  CreateWorkRequestDto,
} from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { DowntimeService } from '../assets/downtime.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ChecklistTemplate } from '../pm/entities/checklist-template.entity';
import { STATUS_TRANSITIONS } from './state-machine';
import { isDueSoon, overdueEscalationLevel } from './sla.util';

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(WoLabor)
    private readonly laborRepository: Repository<WoLabor>,
    @InjectRepository(WoPart)
    private readonly partRepository: Repository<WoPart>,
    @InjectRepository(WoAttachment)
    private readonly attachmentRepository: Repository<WoAttachment>,
    @InjectRepository(WoChecklistResult)
    private readonly checklistRepository: Repository<WoChecklistResult>,
    @InjectRepository(WorkRequest)
    private readonly workRequestRepository: Repository<WorkRequest>,
    @InjectRepository(WoComment)
    private readonly commentRepository: Repository<WoComment>,
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => DowntimeService))
    private readonly downtimeService: DowntimeService,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService,
    @InjectRepository(ChecklistTemplate)
    private readonly checklistTemplateRepository: Repository<ChecklistTemplate>,
    @InjectRepository(WoAssignee)
    private readonly assigneeRepository: Repository<WoAssignee>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CORE CRUD ====================

  async create(dto: CreateWorkOrderDto, userId: string, tenantId: string): Promise<WorkOrder> {
    const woNumber = await this.generateWoNumber(tenantId);

    const workOrder = this.workOrderRepository.create({
      ...dto,
      woNumber,
      tenantId,
      createdById: userId,
      status: WorkOrderStatus.REQUESTED,
    });

    const savedWo = await this.workOrderRepository.save(workOrder);

    // Create checklist items if template provided
    if (dto.checklistTemplateId) {
      await this.createChecklistFromTemplate(savedWo.id, dto.checklistTemplateId, tenantId);
    }

    // Trigger webhooks
    try {
      await this.webhooksService.trigger('wo.created', {
        id: savedWo.id,
        woNumber: savedWo.woNumber,
        title: savedWo.title,
        type: savedWo.type,
        priority: savedWo.priority,
        status: savedWo.status,
        assetId: savedWo.assetId,
      }, tenantId);
    } catch (err) {
      this.logger.warn(`webhook wo.created failed for ${savedWo.id}: ${(err as Error).message}`);
    }

    return this.findOne(savedWo.id, tenantId);
  }

  async findAll(query: WorkOrderQueryDto, tenantId: string): Promise<PaginatedResult<WorkOrder>> {
    const {
      page,
      limit,
      search,
      status,
      type,
      priority,
      assetId,
      locationId,
      dateFrom,
      dateTo,
      pmPlanId,
    } = query;

    const queryBuilder = this.workOrderRepository
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.asset', 'asset')
      .leftJoinAndSelect('wo.location', 'location')
      .leftJoinAndSelect('wo.createdBy', 'createdBy');

    queryBuilder.andWhere('wo.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(wo.title ILIKE :search OR wo.woNumber ILIKE :search OR wo.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status?.length) {
      queryBuilder.andWhere('wo.status IN (:...status)', { status });
    }

    if (type?.length) {
      queryBuilder.andWhere('wo.type IN (:...type)', { type });
    }

    if (priority?.length) {
      queryBuilder.andWhere('wo.priority IN (:...priority)', { priority });
    }

    if (assetId) {
      queryBuilder.andWhere('wo.assetId = :assetId', { assetId });
    }

    if (locationId) {
      queryBuilder.andWhere('wo.locationId = :locationId', { locationId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('wo.scheduledStart >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('wo.scheduledEnd <= :dateTo', { dateTo });
    }

    if (pmPlanId) {
      queryBuilder.andWhere('wo.pmPlanId = :pmPlanId', { pmPlanId });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('wo.createdAt', 'DESC')
      .getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findOne({
      where: { id, tenantId },
      relations: [
        'asset',
        'location',
        'createdBy',
        'assignedTo',
        'labor',
        'labor.user',
        'parts',
        'attachments',
        'checklistResults',
        'assignees',
        'assignees.user',
      ],
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found`);
    }

    return workOrder;
  }

  async update(id: string, dto: UpdateWorkOrderDto, userId: string, tenantId: string): Promise<WorkOrder> {
    const workOrder = await this.findOne(id, tenantId);
    const prevAssignee = workOrder.assignedToId || null;

    Object.assign(workOrder, dto);
    // Treat empty string as an explicit unassign.
    if (dto.assignedToId === '') workOrder.assignedToId = null as unknown as string;

    await this.workOrderRepository.save(workOrder);
    const updated = await this.findOne(id, tenantId);

    // Notify the newly-assigned technician (not when self-assigning).
    const newAssignee = updated.assignedToId || null;
    if (newAssignee && newAssignee !== prevAssignee && newAssignee !== userId) {
      await this.notificationsService.onWorkOrderAssigned(
        { id: updated.id, woNumber: updated.woNumber, title: updated.title },
        newAssignee,
        tenantId,
      );
    }

    return updated;
  }

  // ==================== ADDITIONAL ASSIGNEES (crew) ====================

  /** Add a technician to a work order's crew (beyond the primary assignee). */
  async addAssignee(
    woId: string,
    assigneeUserId: string,
    actorUserId: string,
    tenantId: string,
  ): Promise<WorkOrder> {
    const workOrder = await this.findOne(woId, tenantId);

    const existing = await this.assigneeRepository.findOne({
      where: { woId, userId: assigneeUserId, tenantId },
    });
    if (!existing) {
      await this.assigneeRepository.save(
        this.assigneeRepository.create({ woId, userId: assigneeUserId, tenantId }),
      );
      // Notify the added technician (unless they added themselves).
      if (assigneeUserId !== actorUserId) {
        await this.notificationsService.onWorkOrderAssigned(
          { id: workOrder.id, woNumber: workOrder.woNumber, title: workOrder.title },
          assigneeUserId,
          tenantId,
        );
      }
    }

    return this.findOne(woId, tenantId);
  }

  /** Remove a technician from a work order's crew. */
  async removeAssignee(woId: string, assigneeUserId: string, tenantId: string): Promise<WorkOrder> {
    await this.findOne(woId, tenantId);
    await this.assigneeRepository.delete({ woId, userId: assigneeUserId, tenantId });
    return this.findOne(woId, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const workOrder = await this.findOne(id, tenantId);

    // Release any reserved inventory before deleting
    const reservedParts = (workOrder.parts || []).filter((p) => p.reserved);
    for (const part of reservedParts) {
      try {
        await this.inventoryService.releaseReservation(
          { partId: part.partId, storeroomId: part.storeroomId, workOrderId: id, qty: part.qtyUsed },
          'system',
          tenantId,
        );
      } catch (error) {
        // Log but don't block deletion if release fails
        this.logger.error(`Failed to release reservation for part ${part.partId}:`, error);
      }
    }

    await this.workOrderRepository.remove(workOrder);
  }

  // ==================== STATUS TRANSITIONS ====================

  async updateStatus(id: string, status: WorkOrderStatus, userId: string, tenantId: string, holdReason?: string): Promise<WorkOrder> {
    const workOrder = await this.findOne(id, tenantId);
    const currentStatus = workOrder.status;

    // Validate transition
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${status}`,
      );
    }

    const oldStatus = workOrder.status;
    workOrder.status = status;

    // Track hold reason
    if (status === WorkOrderStatus.ON_HOLD) {
      workOrder.holdReason = (holdReason as any) || null;
    } else if (oldStatus === WorkOrderStatus.ON_HOLD) {
      workOrder.holdReason = null;
    }

    // Record approval when transitioning from PENDING_APPROVAL to OPEN
    if (oldStatus === WorkOrderStatus.PENDING_APPROVAL && status === WorkOrderStatus.OPEN) {
      workOrder.approvedBy = userId;
      workOrder.approvedAt = new Date();
    }

    // Set timestamps based on transition
    if (status === WorkOrderStatus.IN_PROGRESS && !workOrder.actualStart) {
      workOrder.actualStart = new Date();

      // Auto-start downtime tracking if WO has an asset
      if (workOrder.assetId) {
        try {
          await this.downtimeService.startDowntime(
            workOrder.assetId,
            workOrder.title,
            workOrder.id,
            userId,
            tenantId,
          );
        } catch (error) {
          this.logger.error(`Failed to start downtime for asset ${workOrder.assetId}: ${(error as Error).message}`);
        }
      }
    }

    if (status === WorkOrderStatus.COMPLETED) {
      workOrder.actualEnd = new Date();
      workOrder.completedAt = new Date();
      // Calculate actual hours if we have start time
      if (workOrder.actualStart) {
        const durationMs = workOrder.actualEnd.getTime() - workOrder.actualStart.getTime();
        workOrder.actualHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
      }
      // Calculate actual cost from labor and parts
      await this.calculateActualCost(workOrder);

      // Issue reserved stock (deduct from inventory)
      const woParts = await this.partRepository.find({ where: { woId: id, tenantId } });
      for (const part of woParts) {
        if (part.reserved && part.storeroomId) {
          try {
            await this.inventoryService.issueStock(
              { partId: part.partId, storeroomId: part.storeroomId, qty: part.qtyUsed, workOrderId: id, notes: 'Issued on WO completion' },
              userId,
              tenantId,
            );
            await this.inventoryService.releaseReservation(
              { partId: part.partId, storeroomId: part.storeroomId, workOrderId: id, qty: part.qtyUsed },
              userId,
              tenantId,
            );
            part.reserved = false;
            await this.partRepository.save(part);
          } catch (error) {
            this.logger.error(`Failed to issue stock for part ${part.partId}:`, error);
          }
        }
      }
    }

    if (status === WorkOrderStatus.COMPLETED && workOrder.assetId) {
      // Auto-end downtime tracking
      try {
        await this.downtimeService.endDowntime(workOrder.assetId, userId, tenantId);
      } catch (error) {
        this.logger.error(`Failed to end downtime for asset ${workOrder.assetId}: ${(error as Error).message}`);
      }
    }

    if (status === WorkOrderStatus.CANCELLED) {
      const reservedParts = (workOrder.parts || []).filter((p) => p.reserved);
      for (const part of reservedParts) {
        if (!part.storeroomId) continue;
        try {
          await this.inventoryService.releaseReservation(
            { partId: part.partId, storeroomId: part.storeroomId, workOrderId: id, qty: part.qtyUsed },
            userId,
            tenantId,
          );
          part.reserved = false;
          await this.partRepository.save(part);
        } catch (error) {
          this.logger.error(`Failed to release reservation for part ${part.partId}:`, error);
        }
      }
    }

    const savedWo = await this.workOrderRepository.save(workOrder);

    // Send notifications
    await this.notificationsService.onWoStatusChanged(savedWo, oldStatus, tenantId);

    // Trigger webhooks
    try {
      let event = 'wo.status_changed';
      if (status === WorkOrderStatus.COMPLETED) event = 'wo.completed';
      else if (status === WorkOrderStatus.CANCELLED) event = 'wo.cancelled';
      await this.webhooksService.trigger(event, {
        id: savedWo.id,
        woNumber: savedWo.woNumber,
        title: savedWo.title,
        oldStatus,
        newStatus: status,
        assetId: savedWo.assetId,
      }, tenantId);
    } catch (err) {
      this.logger.warn(`webhook ${event} failed for ${savedWo.id}: ${(err as Error).message}`);
    }

    return this.findOne(id, tenantId);
  }

  private async calculateActualCost(workOrder: WorkOrder): Promise<void> {
    const labor = await this.laborRepository.find({ where: { woId: workOrder.id } });
    const parts = await this.partRepository.find({ where: { woId: workOrder.id } });

    const laborCost = labor.reduce((sum, l) => sum + (l.hours * (l.hourlyRate || 0)), 0);
    const partsCost = parts.reduce((sum, p) => sum + (p.qtyUsed * (p.unitCost || 0)), 0);

    workOrder.actualCost = laborCost + partsCost;
  }

  // ==================== NUMBER GENERATION ====================

  async generateWoNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const lastWo = await this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.woNumber LIKE :pattern', { pattern: `WO-${year}-%` })
      .andWhere('wo.tenantId = :tenantId', { tenantId })
      .orderBy('wo.woNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastWo) {
      const parts = lastWo.woNumber.split('-');
      nextNumber = parseInt(parts[2], 10) + 1;
    }

    return `WO-${year}-${String(nextNumber).padStart(5, '0')}`;
  }

  // ==================== LABOR ====================

  async addLabor(woId: string, dto: AddLaborDto, userId: string, tenantId: string): Promise<WoLabor> {
    const workOrder = await this.findOne(woId, tenantId);

    const labor = this.laborRepository.create({
      woId,
      tenantId,
      ...dto,
    });

    return this.laborRepository.save(labor);
  }

  async removeLabor(woId: string, laborId: string, tenantId: string): Promise<void> {
    const labor = await this.laborRepository.findOne({
      where: { id: laborId, woId, tenantId },
    });

    if (!labor) {
      throw new NotFoundException(`Labor entry with ID ${laborId} not found`);
    }

    await this.laborRepository.remove(labor);
  }

  // ==================== COMMENTS ====================

  async getComments(woId: string, tenantId: string): Promise<WoComment[]> {
    // Verifies the work order exists and belongs to the tenant.
    await this.findOne(woId, tenantId);
    return this.commentRepository.find({
      where: { woId, tenantId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async addComment(
    woId: string,
    dto: CreateCommentDto,
    userId: string,
    tenantId: string,
  ): Promise<WoComment> {
    await this.findOne(woId, tenantId);
    const comment = this.commentRepository.create({
      woId,
      tenantId,
      userId,
      body: dto.body,
    });
    const saved = await this.commentRepository.save(comment);
    // Re-fetch with the author so the client can render it immediately.
    const full = (await this.commentRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    })) as WoComment;

    // Notify @mentioned users (validated against tenant membership).
    if (dto.mentions?.length) {
      const author = full?.user;
      const authorName =
        [author?.firstName, author?.lastName].filter(Boolean).join(' ') || author?.email || 'Someone';
      const snippet = dto.body.length > 140 ? `${dto.body.slice(0, 140)}…` : dto.body;
      await this.notificationsService.notifyCommentMentions({
        mentionUserIds: dto.mentions,
        authorUserId: userId,
        authorName,
        snippet,
        workOrderId: woId,
        commentId: saved.id,
        tenantId,
      });
    }

    return full;
  }

  // ==================== PARTS ====================

  async addPart(woId: string, dto: AddPartDto, userId: string, tenantId: string): Promise<WoPart> {
    const workOrder = await this.findOne(woId, tenantId);

    // Resolve storeroom: use provided or find one with available stock
    let storeroomId: string = dto.storeroomId as string;
    if (!storeroomId) {
      const found = await this.inventoryService.findAvailableStoreroom(dto.partId, dto.qtyUsed, tenantId);
      if (!found) {
        throw new BadRequestException('No storeroom has sufficient stock for this part. Please specify a storeroom.');
      }
      storeroomId = found;
    }

    // Reserve stock in inventory
    await this.inventoryService.reserveStock(
      { partId: dto.partId, storeroomId, qty: dto.qtyUsed, workOrderId: woId, notes: `Reserved for WO ${workOrder.woNumber}` },
      userId,
      tenantId,
    );

    const part = this.partRepository.create({
      woId,
      tenantId,
      partId: dto.partId,
      qtyUsed: dto.qtyUsed,
      unitCost: dto.unitCost,
      storeroomId,
      reserved: true,
    });

    return this.partRepository.save(part);
  }

  async removePart(woId: string, partId: string, tenantId: string): Promise<void> {
    const part = await this.partRepository.findOne({
      where: { id: partId, woId, tenantId },
    });

    if (!part) {
      throw new NotFoundException(`Part entry with ID ${partId} not found`);
    }

    // Release reserved inventory
    if (part.reserved && part.storeroomId) {
      await this.inventoryService.releaseReservation(
        { partId: part.partId, storeroomId: part.storeroomId, workOrderId: woId, qty: part.qtyUsed },
        'system',
        tenantId,
      );
    }

    await this.partRepository.remove(part);
  }

  // ==================== ATTACHMENTS ====================

  async addAttachment(
    woId: string,
    file: Express.Multer.File,
    userId: string,
    tenantId: string,
  ): Promise<WoAttachment> {
    const workOrder = await this.findOne(woId, tenantId);

    const storageKey = await this.filesService.uploadFile(
      file,
      `work-orders/${woId}/attachments`,
      tenantId,
    );

    const attachment = this.attachmentRepository.create({
      woId,
      tenantId,
      name: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: userId,
    });

    return this.attachmentRepository.save(attachment);
  }

  async removeAttachment(woId: string, attachmentId: string, tenantId: string): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, woId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    await this.filesService.deleteFile(attachment.storageKey);
    await this.attachmentRepository.remove(attachment);
  }

  async getAttachmentUrl(attachmentId: string, tenantId: string): Promise<string> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    return this.filesService.getSignedUrl(attachment.storageKey);
  }

  // ==================== CHECKLIST ====================

  async saveChecklistResults(
    woId: string,
    dto: SaveChecklistDto,
    userId: string,
    tenantId: string,
  ): Promise<WoChecklistResult[]> {
    const workOrder = await this.findOne(woId, tenantId);

    for (const item of dto.items) {
      const existing = await this.checklistRepository.findOne({
        where: { woId, stepIndex: item.stepIndex, tenantId },
      });

      if (existing) {
        Object.assign(existing, {
          isCompleted: item.isCompleted,
          value: item.value,
          passFail: item.passFail,
          notes: item.notes,
          photoKey: item.photoKey,
          completedBy: item.isCompleted ? userId : null,
          completedAt: item.isCompleted ? new Date() : null,
        });
        await this.checklistRepository.save(existing);
      }
    }

    return this.checklistRepository.find({
      where: { woId, tenantId },
      order: { stepIndex: 'ASC' },
    });
  }

  async uploadChecklistPhoto(
    woId: string,
    stepIndex: number,
    file: Express.Multer.File,
    userId: string,
    tenantId: string,
  ): Promise<string> {
    const storageKey = await this.filesService.uploadFile(
      file,
      `work-orders/${woId}/checklist/${stepIndex}`,
      tenantId,
    );

    const existing = await this.checklistRepository.findOne({
      where: { woId, stepIndex, tenantId },
    });

    if (existing) {
      // If there was a previous photo, delete it
      if (existing.photoKey) {
        try {
          await this.filesService.deleteFile(existing.photoKey);
        } catch (error) {
          this.logger.error('Failed to delete old checklist photo:', error);
        }
      }
      existing.photoKey = storageKey;
      await this.checklistRepository.save(existing);
    }

    return storageKey;
  }

  private async createChecklistFromTemplate(woId: string, templateId: string, tenantId: string): Promise<void> {
    const template = await this.checklistTemplateRepository.findOne({
      where: { id: templateId, tenantId },
    });
    if (!template || !template.items?.length) return;

    const checklistItems = template.items.map((item, index) =>
      this.checklistRepository.create({
        woId,
        tenantId,
        stepIndex: item.step ?? index,
        instruction: item.instruction,
        isCompleted: false,
      }),
    );

    await this.checklistRepository.save(checklistItems);
  }

  // ==================== WORK REQUESTS ====================

  async createRequest(dto: CreateWorkRequestDto, tenantId: string): Promise<WorkRequest> {
    const request = this.workRequestRepository.create({
      ...dto,
      tenantId,
    });
    const savedRequest = await this.workRequestRepository.save(request);

    await this.notificationsService.onWorkRequestSubmitted(savedRequest, tenantId);

    try {
      await this.webhooksService.trigger('request.submitted', {
        id: savedRequest.id,
        title: savedRequest.title,
        priority: savedRequest.priority,
        status: savedRequest.status,
      }, tenantId);
    } catch (err) {
      this.logger.warn(`webhook request.submitted failed for ${savedRequest.id}: ${(err as Error).message}`);
    }

    return savedRequest;
  }

  async findAllRequests(query: WorkOrderQueryDto, tenantId: string): Promise<PaginatedResult<WorkRequest>> {
    const { page, limit } = query;

    const [data, total] = await this.workRequestRepository.findAndCount({
      where: { tenantId },
      relations: ['asset', 'location'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return paginate(data, total, page, limit);
  }

  async approveRequest(id: string, userId: string, tenantId: string): Promise<WorkOrder> {
    const request = await this.workRequestRepository.findOne({
      where: { id, tenantId },
      relations: ['asset', 'location'],
    });

    if (!request) {
      throw new NotFoundException(`Work request with ID ${id} not found`);
    }

    if (request.status !== WorkRequestStatus.PENDING) {
      throw new BadRequestException('Work request has already been processed');
    }

    // Create work order from request
    const workOrder = await this.create(
      {
        title: request.title,
        description: request.description,
        type: WorkOrderType.CORRECTIVE,
        priority: request.priority as any,
        assetId: request.assetId,
        locationId: request.locationId,
      },
      userId,
      tenantId,
    );

    // Update request status
    request.status = WorkRequestStatus.CONVERTED;
    request.woId = workOrder.id;
    request.approvedBy = userId;
    request.approvedAt = new Date();
    await this.workRequestRepository.save(request);

    return workOrder;
  }

  async rejectRequest(id: string, reason: string, userId: string, tenantId: string): Promise<WorkRequest> {
    const request = await this.workRequestRepository.findOne({
      where: { id, tenantId },
    });

    if (!request) {
      throw new NotFoundException(`Work request with ID ${id} not found`);
    }

    if (request.status !== WorkRequestStatus.PENDING) {
      throw new BadRequestException('Work request has already been processed');
    }

    request.status = WorkRequestStatus.REJECTED;
    request.rejectionReason = reason;
    request.approvedBy = userId;
    request.approvedAt = new Date();

    return this.workRequestRepository.save(request);
  }

  // ==================== SIGNATURES ====================

  async uploadSignature(
    woId: string,
    base64png: string,
    userId: string,
    tenantId: string,
  ): Promise<{ signatureUrl: string }> {
    const workOrder = await this.findOne(woId, tenantId);

    // Decode base64 PNG
    const base64Data = base64png.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const storageKey = await this.filesService.uploadBuffer(
      buffer,
      `work-orders/${woId}/signature.png`,
      'image/png',
      tenantId,
    );

    workOrder.completionSignature = storageKey;
    workOrder.signedOffBy = userId;
    workOrder.signedOffAt = new Date();
    await this.workOrderRepository.save(workOrder);

    const signatureUrl = await this.filesService.getSignedUrl(storageKey);
    return { signatureUrl };
  }

  async getSignatureUrl(woId: string, tenantId: string): Promise<string | null> {
    const workOrder = await this.findOne(woId, tenantId);
    if (!workOrder.completionSignature) return null;
    return this.filesService.getSignedUrl(workOrder.completionSignature);
  }

  async uploadChecklistSignature(
    woId: string,
    stepIndex: number,
    base64png: string,
    userId: string,
    tenantId: string,
  ): Promise<string> {
    await this.findOne(woId, tenantId);

    const base64Data = base64png.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const storageKey = await this.filesService.uploadBuffer(
      buffer,
      `work-orders/${woId}/checklist/${stepIndex}/signature.png`,
      'image/png',
      tenantId,
    );

    const existing = await this.checklistRepository.findOne({
      where: { woId, stepIndex, tenantId },
    });

    if (existing) {
      existing.signatureKey = storageKey;
      await this.checklistRepository.save(existing);
    }

    return this.filesService.getSignedUrl(storageKey);
  }

  // ==================== STATISTICS ====================

  async getOpenCount(tenantId: string): Promise<number> {
    return this.workOrderRepository.count({
      where: {
        tenantId,
        status: In([
          WorkOrderStatus.OPEN,
          WorkOrderStatus.IN_PROGRESS,
          WorkOrderStatus.ON_HOLD,
        ]),
      },
    });
  }

  async getOverdueCount(tenantId: string): Promise<number> {
    const now = new Date();
    return this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.status IN (:...statuses)', {
        statuses: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS],
      })
      .andWhere('wo.tenantId = :tenantId', { tenantId })
      // Prefer the explicit SLA dueDate; fall back to the scheduled end for
      // work orders that don't carry an SLA target.
      .andWhere('COALESCE(wo.dueDate, wo.scheduledEnd) < :now', { now })
      .getCount();
  }

  /**
   * SLA sweep (run by the sla-escalation scheduler across all tenants):
   *  - fires WO_DUE_SOON once when an open WO enters the 24h pre-due window;
   *  - escalates overdue WOs through levels 1/2/3 (now / +24h / +72h past due),
   *    notifying assignee + creator only when a new threshold is crossed so the
   *    every-15-min cadence doesn't spam.
   */
  async processSlaEscalations(): Promise<{ dueSoon: number; overdue: number; escalated: number }> {
    const now = Date.now();

    const workOrders = await this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.status IN (:...statuses)', {
        statuses: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS],
      })
      .andWhere('wo.dueDate IS NOT NULL')
      .getMany();

    let dueSoon = 0;
    let overdue = 0;
    let escalated = 0;

    for (const wo of workOrders) {
      const due = new Date(wo.dueDate).getTime();
      const meta = (wo.metadata || {}) as Record<string, unknown>;

      if (due > now) {
        // Upcoming — fire the due-soon nudge once when it enters the window.
        if (isDueSoon(due, now) && !meta.slaDueSoonNotified) {
          meta.slaDueSoonNotified = true;
          wo.metadata = meta;
          await this.workOrderRepository.save(wo);
          await this.notificationsService.onWoDueSoon(wo, wo.tenantId);
          dueSoon++;
        }
        continue;
      }

      // Overdue — escalate to the highest threshold crossed so far.
      overdue++;
      const hoursOver = (now - due) / (60 * 60 * 1000);
      const targetLevel = overdueEscalationLevel(hoursOver);
      if (targetLevel > (wo.escalationLevel || 0)) {
        wo.escalationLevel = targetLevel;
        await this.workOrderRepository.save(wo);
        await this.notificationsService.onWoOverdue(wo, targetLevel, wo.tenantId);
        escalated++;
      }
    }

    return { dueSoon, overdue, escalated };
  }

  async findByAsset(assetId: string, tenantId: string): Promise<WorkOrder[]> {
    return this.workOrderRepository.find({
      where: { assetId, tenantId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
