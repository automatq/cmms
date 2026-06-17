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
  Res,
} from '@nestjs/common';
import { Express } from 'express';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetQueryDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  RecordMeterDto,
  DocumentMetaDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) { }

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all assets' })
  @ApiResponse({ status: 200, description: 'List of assets' })
  findAll(@Query() query: AssetQueryDto, @CurrentUser() user: RequestUser) {
    return this.assetsService.findAll(query, user.tenantId);
  }

  @Get('hierarchy')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset hierarchy' })
  @ApiResponse({ status: 200, description: 'Asset tree structure' })
  getHierarchy(@CurrentUser() user: RequestUser) {
    return this.assetsService.getHierarchy(user.tenantId);
  }

  @Get('qr/resolve/:token')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Resolve an asset tag token' })
  @ApiResponse({ status: 200, description: 'Resolved asset summary' })
  resolveQrToken(@Param('token') token: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.resolveAssetTagToken(token, user.tenantId);
  }

  @Post('qr/bulk-print')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Generate a printable QR PDF for multiple assets' })
  @ApiResponse({ status: 200, description: 'QR label PDF' })
  async bulkPrintQrCodes(
    @Body() body: { assetIds: string[] },
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const pdf = await this.assetsService.bulkPrintQrs(body.assetIds || [], user.tenantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=asset-qr-labels.pdf');
    res.send(pdf);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.findOne(id, user.tenantId);
  }

  @Get(':id/history')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset with full history' })
  @ApiResponse({ status: 200, description: 'Asset with meter history' })
  findWithHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.findWithHistory(id, user.tenantId);
  }

  @Get(':id/children')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get child assets' })
  @ApiResponse({ status: 200, description: 'Child assets' })
  getChildren(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.getChildren(id, user.tenantId);
  }

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: RequestUser) {
    return this.assetsService.create(dto, user.userId, user.tenantId);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.update(id, dto, user.tenantId);
  }

  @Post(':id/retire')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Retire asset' })
  @ApiResponse({ status: 200, description: 'Asset retired' })
  retire(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.retire(id, user.userId, user.tenantId);
  }

  // ==================== METERS ====================

  @Post(':id/meters')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Record meter reading' })
  @ApiResponse({ status: 201, description: 'Meter reading recorded' })
  recordMeterReading(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordMeterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.recordMeterReading(id, dto, user.userId, user.tenantId);
  }

  @Get(':id/health')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Rule-based asset health score (0-100) + band' })
  @ApiResponse({ status: 200, description: 'Asset health score' })
  getHealthScore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.getHealthScore(id, user.tenantId);
  }

  @Get(':id/meters')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get meter history' })
  @ApiResponse({ status: 200, description: 'Meter reading history' })
  getMeterHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.assetsService.getMeterHistory(
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      user.tenantId,
    );
  }

  // ==================== DOCUMENTS ====================

  @Post(':id/documents')
  @Permissions('assets:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document to asset' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: DocumentMetaDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.uploadDocument(id, file, meta, user.userId, user.tenantId);
  }

  @Get(':id/documents/:docId/url')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL for download' })
  getDocumentUrl(
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.getDocumentSignedUrl(docId, user.tenantId);
  }

  @Delete(':id/documents/:docId')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  deleteDocument(
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.deleteDocument(docId, user.tenantId);
  }

  // ==================== QR CODE ====================

  @Get(':id/qr')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get QR metadata for asset tag printing and preview' })
  @ApiResponse({ status: 200, description: 'Asset QR metadata' })
  getAssetQr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.getAssetQr(id, user.tenantId);
  }

  @Get(':id/qr.png')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Download asset tag QR as PNG' })
  @ApiResponse({ status: 200, description: 'QR PNG' })
  async downloadAssetQrPng(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const png = await this.assetsService.getAssetQrPng(id, user.tenantId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="asset-${id}-qr.png"`);
    res.send(png);
  }

  @Get(':id/qr.pdf')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Download a printable QR label PDF for an asset' })
  @ApiResponse({ status: 200, description: 'QR label PDF' })
  async downloadAssetQrPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const pdf = await this.assetsService.getAssetQrPdf(id, user.tenantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="asset-${id}-qr.pdf"`);
    res.send(pdf);
  }

  @Post(':id/qr/regenerate')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Regenerate an asset tag token and invalidate old stickers' })
  @ApiResponse({ status: 200, description: 'Updated asset QR metadata' })
  regenerateAssetQr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.regenerateAssetQr(id, user.tenantId, user.userId);
  }

  @Get(':id/qr-code')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Generate/get QR code for asset' })
  @ApiResponse({ status: 200, description: 'QR code URL' })
  generateQrCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.generateQrCode(id, user.tenantId);
  }

  @Post(':id/image')
  @Permissions('assets:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image for asset' })
  @ApiResponse({ status: 201, description: 'Asset image uploaded' })
  async uploadAssetImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.uploadAssetImage(id, file, user.userId, user.tenantId);
  }
}

// ==================== LOCATIONS CONTROLLER ====================

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly assetsService: AssetsService) { }

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.assetsService.findAllLocations(user.tenantId);
  }

  @Get('tree')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get location tree' })
  @ApiResponse({ status: 200, description: 'Location tree structure' })
  getTree(@CurrentUser() user: RequestUser) {
    return this.assetsService.getLocationTree(user.tenantId);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({ status: 200, description: 'Location details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.findLocationById(id, user.tenantId);
  }

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Create location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: RequestUser) {
    return this.assetsService.createLocation(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Update location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.updateLocation(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Delete location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.deleteLocation(id, user.tenantId);
  }
}

// ==================== CATEGORIES CONTROLLER ====================

@ApiTags('Asset Categories')
@ApiBearerAuth()
@Controller('asset-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly assetsService: AssetsService) { }

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.assetsService.findAllCategories(user.tenantId);
  }

  @Get('tree')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get category tree' })
  @ApiResponse({ status: 200, description: 'Category tree structure' })
  getTree(@CurrentUser() user: RequestUser) {
    return this.assetsService.getCategoryTree(user.tenantId);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.findCategoryById(id, user.tenantId);
  }

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: RequestUser) {
    return this.assetsService.createCategory(dto, user.tenantId);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assetsService.updateCategory(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.assetsService.deleteCategory(id, user.tenantId);
  }
}
