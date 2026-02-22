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

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all assets' })
  @ApiResponse({ status: 200, description: 'List of assets' })
  findAll(@Query() query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get('hierarchy')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset hierarchy' })
  @ApiResponse({ status: 200, description: 'Asset tree structure' })
  getHierarchy() {
    return this.assetsService.getHierarchy();
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/history')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset with full history' })
  @ApiResponse({ status: 200, description: 'Asset with meter history' })
  findWithHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findWithHistory(id);
  }

  @Get(':id/children')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get child assets' })
  @ApiResponse({ status: 200, description: 'Child assets' })
  getChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getChildren(id);
  }

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: { sub: string }) {
    return this.assetsService.create(dto, user.sub);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Post(':id/retire')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Retire asset' })
  @ApiResponse({ status: 200, description: 'Asset retired' })
  retire(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.assetsService.retire(id, user.sub);
  }

  // ==================== METERS ====================

  @Post(':id/meters')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Record meter reading' })
  @ApiResponse({ status: 201, description: 'Meter reading recorded' })
  recordMeterReading(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordMeterDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.assetsService.recordMeterReading(id, dto, user.sub);
  }

  @Get(':id/meters')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get meter history' })
  @ApiResponse({ status: 200, description: 'Meter reading history' })
  getMeterHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.assetsService.getMeterHistory(
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
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
    @CurrentUser() user: { sub: string },
  ) {
    return this.assetsService.uploadDocument(id, file, meta, user.sub);
  }

  @Get(':id/documents/:docId/url')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL for download' })
  getDocumentUrl(@Param('docId', ParseUUIDPipe) docId: string) {
    return this.assetsService.getDocumentSignedUrl(docId);
  }

  @Delete(':id/documents/:docId')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  deleteDocument(@Param('docId', ParseUUIDPipe) docId: string) {
    return this.assetsService.deleteDocument(docId);
  }

  // ==================== QR CODE ====================

  @Get(':id/qr-code')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Generate/get QR code for asset' })
  @ApiResponse({ status: 200, description: 'QR code URL' })
  generateQrCode(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.generateQrCode(id);
  }
}

// ==================== LOCATIONS CONTROLLER ====================

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  findAll() {
    return this.assetsService.findAllLocations();
  }

  @Get('tree')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get location tree' })
  @ApiResponse({ status: 200, description: 'Location tree structure' })
  getTree() {
    return this.assetsService.getLocationTree();
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({ status: 200, description: 'Location details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findLocationById(id);
  }

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Create location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@Body() dto: CreateLocationDto) {
    return this.assetsService.createLocation(dto);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Update location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.assetsService.updateLocation(id, dto);
  }

  @Delete(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Delete location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.deleteLocation(id);
  }
}

// ==================== CATEGORIES CONTROLLER ====================

@ApiTags('Asset Categories')
@ApiBearerAuth()
@Controller('asset-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll() {
    return this.assetsService.findAllCategories();
  }

  @Get('tree')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get category tree' })
  @ApiResponse({ status: 200, description: 'Category tree structure' })
  getTree() {
    return this.assetsService.getCategoryTree();
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findCategoryById(id);
  }

  @Post()
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  create(@Body() dto: CreateCategoryDto) {
    return this.assetsService.createCategory(dto);
  }

  @Patch(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.assetsService.updateCategory(id, dto);
  }

  @Delete(':id')
  @Permissions('assets:write')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.deleteCategory(id);
  }
}
