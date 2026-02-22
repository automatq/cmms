import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
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
  WorkRequest,
  WorkRequestStatus,
} from './entities';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  WorkOrderQueryDto,
  UpdateStatusDto,
  AddLaborDto,
  AddPartDto,
  SaveChecklistDto,
  CreateWorkRequestDto,
} from './dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';

// Valid status transitions
const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.DRAFT]: [WorkOrderStatus.OPEN],
  [WorkOrderStatus.OPEN]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD],
  [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.ON_HOLD, WorkOrderStatus.COMPLETED],
  [WorkOrderStatus.ON_HOLD]: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.COMPLETED]: [WorkOrderStatus.CLOSED, WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.CLOSED]: [],
};

@Injectable()
export class WorkOrdersService {
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
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CORE CRUD ====================

  async create(dto: CreateWorkOrderDto, userId: string): Promise<WorkOrder> {
    const woNumber = await this.generateWoNumber();

    const workOrder = this.workOrderRepository.create({
      ...dto,
      woNumber,
      createdById: userId,
      status: WorkOrderStatus.DRAFT,
    });

    const savedWo = await this.workOrderRepository.save(workOrder);

    // Create checklist items if template provided
    if (dto.checklistTemplateId) {
      await this.createChecklistFromTemplate(savedWo.id, dto.checklistTemplateId);
    }

    // Notify assigned users
    if (dto.assignedTo?.length) {
      await this.notificationsService.onWoAssigned(savedWo, dto.assignedTo);
    }

    return this.findOne(savedWo.id);
  }

  async findAll(query: WorkOrderQueryDto): Promise<PaginatedResult<WorkOrder>> {
    const {
      page,
      limit,
      search,
      status,
      type,
      priority,
      assetId,
      locationId,
      assignedTo,
      dateFrom,
      dateTo,
      pmPlanId,
    } = query;

    const queryBuilder = this.workOrderRepository
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.asset', 'asset')
      .leftJoinAndSelect('wo.location', 'location')
      .leftJoinAndSelect('wo.createdBy', 'createdBy');

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

    if (assignedTo) {
      queryBuilder.andWhere(':assignedTo = ANY(wo.assignedTo)', { assignedTo });
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

  async findOne(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findOne({
      where: { id },
      relations: [
        'asset',
        'location',
        'createdBy',
        'labor',
        'labor.user',
        'parts',
        'attachments',
        'checklistResults',
      ],
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found`);
    }

    return workOrder;
  }

  async update(id: string, dto: UpdateWorkOrderDto, userId: string): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);
    
    const oldAssignedTo = workOrder.assignedTo || [];
    Object.assign(workOrder, dto);
    
    const savedWo = await this.workOrderRepository.save(workOrder);

    // Notify newly assigned users
    if (dto.assignedTo) {
      const newlyAssigned = dto.assignedTo.filter((u) => !oldAssignedTo.includes(u));
      if (newlyAssigned.length) {
        await this.notificationsService.onWoAssigned(savedWo, newlyAssigned);
      }
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const workOrder = await this.findOne(id);
    await this.workOrderRepository.remove(workOrder);
  }

  // ==================== STATUS TRANSITIONS ====================

  async updateStatus(id: string, status: WorkOrderStatus, userId: string): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);
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

    // Set timestamps based on transition
    if (status === WorkOrderStatus.IN_PROGRESS && !workOrder.actualStart) {
      workOrder.actualStart = new Date();
    }

    if (status === WorkOrderStatus.COMPLETED) {
      workOrder.actualEnd = new Date();
      // Calculate actual hours if we have start time
      if (workOrder.actualStart) {
        const durationMs = workOrder.actualEnd.getTime() - workOrder.actualStart.getTime();
        workOrder.actualHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
      }
      // Calculate actual cost from labor and parts
      await this.calculateActualCost(workOrder);
    }

    if (status === WorkOrderStatus.CLOSED) {
      workOrder.closedAt = new Date();
    }

    const savedWo = await this.workOrderRepository.save(workOrder);
    
    // Send notifications
    await this.notificationsService.onWoStatusChanged(savedWo, oldStatus);

    return this.findOne(id);
  }

  private async calculateActualCost(workOrder: WorkOrder): Promise<void> {
    const labor = await this.laborRepository.find({ where: { woId: workOrder.id } });
    const parts = await this.partRepository.find({ where: { woId: workOrder.id } });

    const laborCost = labor.reduce((sum, l) => sum + (l.hours * (l.hourlyRate || 0)), 0);
    const partsCost = parts.reduce((sum, p) => sum + (p.qtyUsed * (p.unitCost || 0)), 0);

    workOrder.actualCost = laborCost + partsCost;
  }

  // ==================== NUMBER GENERATION ====================

  async generateWoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastWo = await this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.woNumber LIKE :pattern', { pattern: `WO-${year}-%` })
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

  async addLabor(woId: string, dto: AddLaborDto, userId: string): Promise<WoLabor> {
    const workOrder = await this.findOne(woId);

    const labor = this.laborRepository.create({
      woId,
      ...dto,
    });

    return this.laborRepository.save(labor);
  }

  async removeLabor(woId: string, laborId: string): Promise<void> {
    const labor = await this.laborRepository.findOne({
      where: { id: laborId, woId },
    });

    if (!labor) {
      throw new NotFoundException(`Labor entry with ID ${laborId} not found`);
    }

    await this.laborRepository.remove(labor);
  }

  // ==================== PARTS ====================

  async addPart(woId: string, dto: AddPartDto): Promise<WoPart> {
    const workOrder = await this.findOne(woId);

    // TODO: Check inventory stock and reserve qty via InventoryService

    const part = this.partRepository.create({
      woId,
      ...dto,
      reserved: true,
    });

    return this.partRepository.save(part);
  }

  async removePart(woId: string, partId: string): Promise<void> {
    const part = await this.partRepository.findOne({
      where: { id: partId, woId },
    });

    if (!part) {
      throw new NotFoundException(`Part entry with ID ${partId} not found`);
    }

    // TODO: Release reserved qty via InventoryService

    await this.partRepository.remove(part);
  }

  // ==================== ATTACHMENTS ====================

  async addAttachment(
    woId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<WoAttachment> {
    const workOrder = await this.findOne(woId);

    const storageKey = await this.filesService.uploadFile(
      file,
      `work-orders/${woId}/attachments`,
    );

    const attachment = this.attachmentRepository.create({
      woId,
      name: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: userId,
    });

    return this.attachmentRepository.save(attachment);
  }

  async removeAttachment(woId: string, attachmentId: string): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, woId },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    await this.filesService.deleteFile(attachment.storageKey);
    await this.attachmentRepository.remove(attachment);
  }

  async getAttachmentUrl(attachmentId: string): Promise<string> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
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
  ): Promise<WoChecklistResult[]> {
    const workOrder = await this.findOne(woId);

    for (const item of dto.items) {
      const existing = await this.checklistRepository.findOne({
        where: { woId, stepIndex: item.stepIndex },
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
      where: { woId },
      order: { stepIndex: 'ASC' },
    });
  }

  private async createChecklistFromTemplate(woId: string, templateId: string): Promise<void> {
    // TODO: Fetch template from PM module and create checklist items
    // For now, this is a placeholder
  }

  // ==================== WORK REQUESTS ====================

  async createRequest(dto: CreateWorkRequestDto): Promise<WorkRequest> {
    const request = this.workRequestRepository.create(dto);
    const savedRequest = await this.workRequestRepository.save(request);
    
    await this.notificationsService.onWorkRequestSubmitted(savedRequest);
    
    return savedRequest;
  }

  async findAllRequests(query: WorkOrderQueryDto): Promise<PaginatedResult<WorkRequest>> {
    const { page, limit } = query;

    const [data, total] = await this.workRequestRepository.findAndCount({
      relations: ['asset', 'location'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return paginate(data, total, page, limit);
  }

  async approveRequest(id: string, userId: string): Promise<WorkOrder> {
    const request = await this.workRequestRepository.findOne({
      where: { id },
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
    );

    // Update request status
    request.status = WorkRequestStatus.CONVERTED;
    request.woId = workOrder.id;
    request.approvedBy = userId;
    request.approvedAt = new Date();
    await this.workRequestRepository.save(request);

    return workOrder;
  }

  async rejectRequest(id: string, reason: string, userId: string): Promise<WorkRequest> {
    const request = await this.workRequestRepository.findOne({
      where: { id },
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

  // ==================== STATISTICS ====================

  async getOpenCount(): Promise<number> {
    return this.workOrderRepository.count({
      where: {
        status: In([
          WorkOrderStatus.OPEN,
          WorkOrderStatus.IN_PROGRESS,
          WorkOrderStatus.ON_HOLD,
        ]),
      },
    });
  }

  async getOverdueCount(): Promise<number> {
    const now = new Date();
    return this.workOrderRepository
      .createQueryBuilder('wo')
      .where('wo.status IN (:...statuses)', {
        statuses: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS],
      })
      .andWhere('wo.scheduledEnd < :now', { now })
      .getCount();
  }

  async findByAsset(assetId: string): Promise<WorkOrder[]> {
    return this.workOrderRepository.find({
      where: { assetId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
