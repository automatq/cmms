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
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
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
  SaveChecklistDto,
  CreateWorkRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

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
  findAll(@Query() query: WorkOrderQueryDto) {
    return this.workOrdersService.findAll(query);
  }

  @Get('stats/open-count')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get count of open work orders' })
  @ApiResponse({ status: 200, description: 'Open work orders count' })
  getOpenCount() {
    return this.workOrdersService.getOpenCount();
  }

  @Get('stats/overdue-count')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get count of overdue work orders' })
  @ApiResponse({ status: 200, description: 'Overdue work orders count' })
  getOverdueCount() {
    return this.workOrdersService.getOverdueCount();
  }

  @Get(':id')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work order by ID' })
  @ApiResponse({ status: 200, description: 'Work order details' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Post()
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.create(dto, user.sub);
  }

  @Patch(':id')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Update work order' })
  @ApiResponse({ status: 200, description: 'Work order updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Delete work order' })
  @ApiResponse({ status: 200, description: 'Work order deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.workOrdersService.delete(id);
  }

  // ==================== STATUS ====================

  @Patch(':id/status')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Update work order status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.updateStatus(id, dto.status, user.sub);
  }

  // ==================== LABOR ====================

  @Post(':id/labor')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Add labor to work order' })
  @ApiResponse({ status: 201, description: 'Labor added' })
  addLabor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLaborDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.addLabor(id, dto, user.sub);
  }

  @Delete(':id/labor/:laborId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Remove labor from work order' })
  @ApiResponse({ status: 200, description: 'Labor removed' })
  removeLabor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('laborId', ParseUUIDPipe) laborId: string,
  ) {
    return this.workOrdersService.removeLabor(id, laborId);
  }

  // ==================== PARTS ====================

  @Post(':id/parts')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Add part to work order' })
  @ApiResponse({ status: 201, description: 'Part added' })
  addPart(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartDto,
  ) {
    return this.workOrdersService.addPart(id, dto);
  }

  @Delete(':id/parts/:partId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Remove part from work order' })
  @ApiResponse({ status: 200, description: 'Part removed' })
  removePart(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partId', ParseUUIDPipe) partId: string,
  ) {
    return this.workOrdersService.removePart(id, partId);
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
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.addAttachment(id, file, user.sub);
  }

  @Get(':id/attachments/:attachmentId/url')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get attachment download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL' })
  getAttachmentUrl(@Param('attachmentId', ParseUUIDPipe) attachmentId: string) {
    return this.workOrdersService.getAttachmentUrl(attachmentId);
  }

  @Delete(':id/attachments/:attachmentId')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Delete attachment' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  removeAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.workOrdersService.removeAttachment(id, attachmentId);
  }

  // ==================== CHECKLIST ====================

  @Post(':id/checklist')
  @Permissions('work_orders:write')
  @ApiOperation({ summary: 'Save checklist results' })
  @ApiResponse({ status: 200, description: 'Checklist saved' })
  saveChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveChecklistDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.saveChecklistResults(id, dto, user.sub);
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
    @CurrentUser() user: { sub: string },
  ) {
    const stepIndexNum = parseInt(stepIndex, 10);
    const storageKey = await this.workOrdersService.uploadChecklistPhoto(woId, stepIndexNum, file, user.sub);
    return { storageKey };
  }
}

// ==================== WORK REQUESTS CONTROLLER ====================

@ApiTags('Work Requests')
@Controller('work-requests')
export class WorkRequestsController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('work_orders:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all work requests' })
  @ApiResponse({ status: 200, description: 'List of work requests' })
  findAll(@Query() query: WorkOrderQueryDto) {
    return this.workOrdersService.findAllRequests(query);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a work request (public)' })
  @ApiResponse({ status: 201, description: 'Work request created' })
  create(@Body() dto: CreateWorkRequestDto) {
    return this.workOrdersService.createRequest(dto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('work_orders:write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve work request' })
  @ApiResponse({ status: 200, description: 'Work request approved' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.approveRequest(id, user.sub);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('work_orders:write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject work request' })
  @ApiResponse({ status: 200, description: 'Work request rejected' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workOrdersService.rejectRequest(id, reason, user.sub);
  }
}
