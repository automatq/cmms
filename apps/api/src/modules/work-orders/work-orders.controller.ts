import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
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
  AddAssigneeDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { TenantService } from '../../common/tenant/tenant.service';

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get all work orders' })
  @ApiResponse({ status: 200, description: 'List of work orders' })
  findAll(@Query() query: WorkOrderQueryDto, @CurrentUser() user: RequestUser) {
    return this.workOrdersService.findAll(query, user.tenantId);
  }

  @Get('stats/open-count')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get count of open work orders' })
  @ApiResponse({ status: 200, description: 'Open work orders count' })
  getOpenCount(@CurrentUser() user: RequestUser) {
    return this.workOrdersService.getOpenCount(user.tenantId);
  }

  @Get('stats/overdue-count')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get count of overdue work orders' })
  @ApiResponse({ status: 200, description: 'Overdue work orders count' })
  getOverdueCount(@CurrentUser() user: RequestUser) {
    return this.workOrdersService.getOverdueCount(user.tenantId);
  }

  // ==================== WORK REQUESTS (authenticated) ====================
  // IMPORTANT: these literal-path routes MUST be declared before @Get(':id')
  // and @Patch(':id') because NestJS matches routes in registration order.
  // Otherwise GET /work-orders/requests hits findOne(id='requests') and
  // ParseUUIDPipe rejects it with 400.

  @Get('requests')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get all work requests' })
  @ApiResponse({ status: 200, description: 'List of work requests' })
  findAllRequests(@Query() query: WorkOrderQueryDto, @CurrentUser() user: RequestUser) {
    return this.workOrdersService.findAllRequests(query, user.tenantId);
  }

  @Patch('requests/:id/approve')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Approve work request' })
  @ApiResponse({ status: 200, description: 'Work request approved' })
  approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.approveRequest(id, user.userId, user.tenantId);
  }

  @Patch('requests/:id/reject')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Reject work request' })
  @ApiResponse({ status: 200, description: 'Work request rejected' })
  rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.rejectRequest(id, reason, user.userId, user.tenantId);
  }

  // ==================== WORK ORDER CRUD ====================

  @Get(':id')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work order by ID' })
  @ApiResponse({ status: 200, description: 'Work order details' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.workOrdersService.findOne(id, user.tenantId);
  }

  @Post()
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.create(dto, user.userId, user.tenantId);
  }

  @Patch(':id')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Update work order' })
  @ApiResponse({ status: 200, description: 'Work order updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.update(id, dto, user.userId, user.tenantId);
  }

  @Delete(':id')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Delete work order' })
  @ApiResponse({ status: 200, description: 'Work order deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.workOrdersService.delete(id, user.tenantId);
  }

  // ==================== STATUS ====================

  @Patch(':id/status')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Update work order status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.updateStatus(id, dto.status, user.userId, user.tenantId, dto.holdReason);
  }

  // ==================== LABOR ====================

  @Post(':id/labor')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Add labor to work order' })
  @ApiResponse({ status: 201, description: 'Labor added' })
  addLabor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLaborDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.addLabor(id, dto, user.userId, user.tenantId);
  }

  @Delete(':id/labor/:laborId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Remove labor from work order' })
  @ApiResponse({ status: 200, description: 'Labor removed' })
  removeLabor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('laborId', ParseUUIDPipe) laborId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.removeLabor(id, laborId, user.tenantId);
  }

  // ==================== ADDITIONAL ASSIGNEES (crew) ====================

  @Post(':id/assignees')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Add a technician to the work order crew' })
  @ApiResponse({ status: 201, description: 'Assignee added' })
  addAssignee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAssigneeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.addAssignee(id, dto.userId, user.userId, user.tenantId);
  }

  @Delete(':id/assignees/:userId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Remove a technician from the work order crew' })
  @ApiResponse({ status: 200, description: 'Assignee removed' })
  removeAssignee(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.removeAssignee(id, userId, user.tenantId);
  }

  // ==================== COMMENTS ====================

  @Get(':id/comments')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'List work order comments' })
  @ApiResponse({ status: 200, description: 'Comments' })
  getComments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.workOrdersService.getComments(id, user.tenantId);
  }

  @Post(':id/comments')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Add a comment to a work order' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.addComment(id, dto, user.userId, user.tenantId);
  }

  // ==================== PARTS ====================

  @Post(':id/parts')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Add part to work order' })
  @ApiResponse({ status: 201, description: 'Part added' })
  addPart(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.addPart(id, dto, user.userId, user.tenantId);
  }

  @Delete(':id/parts/:partId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Remove part from work order' })
  @ApiResponse({ status: 200, description: 'Part removed' })
  removePart(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.removePart(id, partId, user.tenantId);
  }

  // ==================== ATTACHMENTS ====================

  @Post(':id/attachments')
  @Permissions('work_orders:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload attachment to work order' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded' })
  addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.addAttachment(id, file, user.userId, user.tenantId);
  }

  @Get(':id/attachments/:attachmentId/url')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get attachment download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL' })
  getAttachmentUrl(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.getAttachmentUrl(attachmentId, user.tenantId);
  }

  @Delete(':id/attachments/:attachmentId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Delete attachment' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  removeAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.removeAttachment(id, attachmentId, user.tenantId);
  }

  // ==================== CHECKLIST ====================

  @Post(':id/checklist')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Save checklist results' })
  @ApiResponse({ status: 200, description: 'Checklist saved' })
  saveChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveChecklistDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.saveChecklistResults(id, dto, user.userId, user.tenantId);
  }

  @Post(':id/checklist/:stepIndex/photo')
  @Permissions('work_orders:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload photo for checklist item' })
  @ApiResponse({ status: 201, description: 'Photo uploaded and linked to checklist item' })
  async uploadChecklistPhoto(
    @Param('id', ParseUUIDPipe) woId: string,
    @Param('stepIndex') stepIndex: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    const stepIndexNum = parseInt(stepIndex, 10);
    const storageKey = await this.workOrdersService.uploadChecklistPhoto(woId, stepIndexNum, file, user.userId, user.tenantId);
    return { storageKey };
  }

  // ==================== SIGNATURES ====================

  @Post(':id/signature')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Upload completion signature' })
  @ApiResponse({ status: 201, description: 'Signature uploaded' })
  uploadSignature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('signature') signature: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workOrdersService.uploadSignature(id, signature, user.userId, user.tenantId);
  }

  @Get(':id/signature')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get completion signature URL' })
  @ApiResponse({ status: 200, description: 'Signature URL' })
  async getSignature(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const url = await this.workOrdersService.getSignatureUrl(id, user.tenantId);
    return { signatureUrl: url };
  }

  @Post(':id/checklist/:stepIndex/signature')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Upload checklist step signature' })
  @ApiResponse({ status: 201, description: 'Checklist signature uploaded' })
  async uploadChecklistSignature(
    @Param('id', ParseUUIDPipe) woId: string,
    @Param('stepIndex') stepIndex: string,
    @Body('signature') signature: string,
    @CurrentUser() user: RequestUser,
  ) {
    const url = await this.workOrdersService.uploadChecklistSignature(
      woId,
      parseInt(stepIndex, 10),
      signature,
      user.userId,
      user.tenantId,
    );
    return { signatureUrl: url };
  }

}

// ==================== PUBLIC WORK REQUESTS (slug-based) ====================

@ApiTags('Work Requests')
@Controller('tenants/:slug/work-requests')
export class WorkRequestsController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a work request (public)' })
  @ApiResponse({ status: 201, description: 'Work request created' })
  async create(
    @Param('slug') slug: string,
    @Body() dto: CreateWorkRequestDto,
  ) {
    const tenant = await this.tenantService.findBySlug(slug);
    if (!tenant || tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new NotFoundException('Organization not found');
    }
    return this.workOrdersService.createRequest(dto, tenant.id);
  }
}
