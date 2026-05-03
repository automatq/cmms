import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Asset,
  AssetStatus,
  AssetCategory,
  AssetDocument,
  AssetMeter,
  Location,
} from './entities';
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
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { FilesService } from '../files/files.service';
import { UsageService } from '../../common/tenant/usage.service';
import { TenantService } from '../../common/tenant/tenant.service';

export interface AssetQrMetadata {
  assetId: string;
  assetTagToken: string;
  assetTagVersion: number;
  assetTagUrl: string;
  assetTagPreviewUrl: string;
  previewSvgUrl: string;
  downloadPngUrl: string;
  downloadPdfUrl: string;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private assetNumberCounter = 0;

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetCategory)
    private readonly categoryRepository: Repository<AssetCategory>,
    @InjectRepository(AssetDocument)
    private readonly documentRepository: Repository<AssetDocument>,
    @InjectRepository(AssetMeter)
    private readonly meterRepository: Repository<AssetMeter>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
    private readonly usageService: UsageService,
    private readonly tenantService: TenantService,
  ) {}

  private getPublicUrl(): string {
    return (this.configService.get<string>('PUBLIC_URL') || '').replace(/\/$/, '');
  }

  private buildAssetTagUrl(assetTagToken: string): string {
    return `${this.getPublicUrl()}/scan/asset/${assetTagToken}`;
  }

  private buildApiPath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  private generateAssetTagToken(): string {
    return randomBytes(16).toString('base64url');
  }

  private async generateUniqueAssetTagToken(): Promise<string> {
    for (;;) {
      const candidate = this.generateAssetTagToken();
      const existing = await this.assetRepository.findOne({
        where: { assetTagToken: candidate },
        select: ['id'],
      });

      if (!existing) {
        return candidate;
      }
    }
  }

  private async generateQrSvg(url: string): Promise<string> {
    return QRCode.toString(url, {
      type: 'svg',
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  }

  private async generateQrPng(url: string, width = 420): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      type: 'png',
      width,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  }

  private svgToDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private async buildAssetQrMetadata(asset: Asset): Promise<AssetQrMetadata> {
    const assetTagUrl = this.buildAssetTagUrl(asset.assetTagToken);
    const svg = await this.generateQrSvg(assetTagUrl);
    const previewSvgUrl = this.svgToDataUrl(svg);

    return {
      assetId: asset.id,
      assetTagToken: asset.assetTagToken,
      assetTagVersion: asset.assetTagVersion,
      assetTagUrl,
      assetTagPreviewUrl: previewSvgUrl,
      previewSvgUrl,
      downloadPngUrl: this.buildApiPath(`/assets/${asset.id}/qr.png`),
      downloadPdfUrl: this.buildApiPath(`/assets/${asset.id}/qr.pdf`),
    };
  }

  private async decorateAssetQr(asset: Asset): Promise<Asset> {
    const metadata = await this.buildAssetQrMetadata(asset);
    asset.assetTagUrl = metadata.assetTagUrl;
    asset.assetTagPreviewUrl = metadata.assetTagPreviewUrl;
    return asset;
  }

  private async decorateAsset(asset: Asset): Promise<Asset> {
    await this.decorateAssetImageUrl(asset);
    return this.decorateAssetQr(asset);
  }

  private normalizeIncomingCustomFields(
    customFields?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!customFields) {
      return customFields;
    }

    const normalized = { ...customFields };
    if (typeof normalized.imageUrl === 'string' && normalized.imageUrl) {
      normalized.imageUrl = this.filesService.resolveStorageKey(normalized.imageUrl);
    }
    delete normalized.imageKey;
    return normalized;
  }

  private async decorateAssetImageUrl(asset: Asset): Promise<Asset> {
    const imageValue = asset.customFields?.imageUrl;
    if (typeof imageValue !== 'string' || !imageValue) {
      return asset;
    }

    const imageKey = this.filesService.resolveStorageKey(imageValue);
    asset.customFields = {
      ...asset.customFields,
      imageKey,
      imageUrl: await this.filesService.getSignedUrl(imageKey),
    };
    return asset;
  }

  // ==================== ASSET METHODS ====================

  async create(dto: CreateAssetDto, userId: string, tenantId: string): Promise<Asset> {
    await this.usageService.enforceAssetLimit(tenantId);

    const assetNumber = await this.generateAssetNumber(tenantId);

    const asset = this.assetRepository.create({
      ...dto,
      customFields: this.normalizeIncomingCustomFields(dto.customFields),
      assetNumber,
      tenantId,
    });

    const savedAsset = await this.assetRepository.save(asset);
    await this.tenantService.incrementAssetCount(tenantId);
    return this.decorateAsset(savedAsset);
  }

  async findAll(query: AssetQueryDto, tenantId: string): Promise<PaginatedResult<Asset>> {
    const { page, limit, search, status, categoryId, locationId, parentId, isCritical } = query;

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location')
      .andWhere('asset.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(asset.name ILIKE :search OR asset.assetNumber ILIKE :search OR asset.serialNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('asset.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder.andWhere('asset.categoryId = :categoryId', { categoryId });
    }

    if (locationId) {
      queryBuilder.andWhere('asset.locationId = :locationId', { locationId });
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        queryBuilder.andWhere('asset.parentId IS NULL');
      } else {
        queryBuilder.andWhere('asset.parentId = :parentId', { parentId });
      }
    }

    if (isCritical !== undefined) {
      queryBuilder.andWhere('asset.isCritical = :isCritical', { isCritical });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('asset.createdAt', 'DESC')
      .getManyAndCount();

    return paginate(
      await Promise.all(data.map((asset) => this.decorateAsset(asset))),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string, tenantId: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id, tenantId },
      relations: ['category', 'location', 'parent', 'children', 'documents'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return this.decorateAsset(asset);
  }

  async findWithHistory(
    id: string,
    tenantId: string,
  ): Promise<{ asset: Asset; meterHistory: AssetMeter[] }> {
    const asset = await this.findOne(id, tenantId);
    const meterHistory = await this.meterRepository.find({
      where: { assetId: id, tenantId },
      order: { recordedAt: 'DESC' },
      take: 50,
    });

    return {
      asset: await this.decorateAsset(asset),
      meterHistory,
    };
  }

  async update(id: string, dto: UpdateAssetDto, tenantId: string): Promise<Asset> {
    const asset = await this.findOne(id, tenantId);
    const normalizedCustomFields =
      dto.customFields !== undefined
        ? this.normalizeIncomingCustomFields(dto.customFields)
        : undefined;
    Object.assign(asset, {
      ...dto,
      ...(normalizedCustomFields !== undefined
        ? { customFields: normalizedCustomFields }
        : {}),
    });
    const saved = await this.assetRepository.save(asset);
    return this.decorateAsset(saved);
  }

  async retire(id: string, userId: string, tenantId: string): Promise<Asset> {
    const asset = await this.findOne(id, tenantId);
    asset.status = AssetStatus.RETIRED;
    asset.retiredAt = new Date();
    const saved = await this.assetRepository.save(asset);
    return this.decorateAsset(saved);
  }

  async getHierarchy(tenantId: string): Promise<Asset[]> {
    const assets = await this.assetRepository.find({
      where: { parentId: IsNull(), tenantId },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });
    return Promise.all(assets.map((asset) => this.decorateAsset(asset)));
  }

  async getChildren(parentId: string, tenantId: string): Promise<Asset[]> {
    const assets = await this.assetRepository.find({
      where: { parentId, tenantId },
      relations: ['category', 'location'],
      order: { name: 'ASC' },
    });
    return Promise.all(assets.map((asset) => this.decorateAsset(asset)));
  }

  private async generateAssetNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const lastAsset = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.assetNumber LIKE :pattern', { pattern: `AST-${year}-%` })
      .andWhere('asset.tenantId = :tenantId', { tenantId })
      .orderBy('asset.assetNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastAsset) {
      const parts = lastAsset.assetNumber.split('-');
      nextNumber = parseInt(parts[2], 10) + 1;
    }

    return `AST-${year}-${String(nextNumber).padStart(5, '0')}`;
  }

  // ==================== METER METHODS ====================

  async recordMeterReading(
    assetId: string,
    dto: RecordMeterDto,
    userId: string,
    tenantId: string,
  ): Promise<AssetMeter> {
    const asset = await this.findOne(assetId, tenantId);

    if (dto.reading < asset.currentMeterValue) {
      throw new BadRequestException(
        'New meter reading cannot be less than current value',
      );
    }

    const meter = this.meterRepository.create({
      assetId,
      reading: dto.reading,
      notes: dto.notes,
      recordedBy: userId,
      tenantId,
    });

    await this.meterRepository.save(meter);

    asset.currentMeterValue = dto.reading;
    await this.assetRepository.save(asset);

    return meter;
  }

  async getMeterHistory(
    assetId: string,
    from?: Date,
    to?: Date,
    tenantId?: string,
  ): Promise<AssetMeter[]> {
    const queryBuilder = this.meterRepository
      .createQueryBuilder('meter')
      .where('meter.assetId = :assetId', { assetId })
      .andWhere('meter.tenantId = :tenantId', { tenantId });

    if (from) {
      queryBuilder.andWhere('meter.recordedAt >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('meter.recordedAt <= :to', { to });
    }

    return queryBuilder.orderBy('meter.recordedAt', 'DESC').getMany();
  }

  // ==================== DOCUMENT METHODS ====================

  async uploadDocument(
    assetId: string,
    file: Express.Multer.File,
    meta: DocumentMetaDto,
    userId: string,
    tenantId: string,
  ): Promise<AssetDocument> {
    const asset = await this.findOne(assetId, tenantId);

    const storageKey = await this.filesService.uploadFile(
      file,
      `assets/${assetId}/documents`,
      tenantId,
    );

    const doc = this.documentRepository.create({
      assetId,
      name: meta.name,
      type: meta.type,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: userId,
      tenantId,
    });

    return this.documentRepository.save(doc);
  }

  async getDocumentSignedUrl(documentId: string, tenantId: string): Promise<string> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return this.filesService.getSignedUrl(doc.storageKey);
  }

  async deleteDocument(documentId: string, tenantId: string): Promise<void> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    await this.filesService.deleteFile(doc.storageKey);
    await this.documentRepository.remove(doc);
  }

  // ==================== QR CODE ====================

  async getAssetQr(assetId: string, tenantId: string): Promise<AssetQrMetadata> {
    const asset = await this.findOne(assetId, tenantId);
    return this.buildAssetQrMetadata(asset);
  }

  async getAssetQrPng(assetId: string, tenantId: string): Promise<Buffer> {
    const asset = await this.findOne(assetId, tenantId);
    return this.generateQrPng(this.buildAssetTagUrl(asset.assetTagToken));
  }

  async getAssetQrPdf(assetId: string, tenantId: string): Promise<Buffer> {
    const asset = await this.findOne(assetId, tenantId);
    return this.buildQrPdf([asset]);
  }

  async regenerateAssetQr(
    assetId: string,
    tenantId: string,
    userId: string,
  ): Promise<AssetQrMetadata> {
    const asset = await this.findOne(assetId, tenantId);
    asset.assetTagToken = await this.generateUniqueAssetTagToken();
    asset.assetTagVersion = (asset.assetTagVersion || 1) + 1;
    asset.assetTagRegeneratedAt = new Date();
    asset.assetTagRegeneratedBy = userId;
    await this.assetRepository.save(asset);
    return this.buildAssetQrMetadata(asset);
  }

  async bulkPrintQrs(assetIds: string[], tenantId: string): Promise<Buffer> {
    if (!assetIds.length) {
      throw new BadRequestException('Select at least one asset to print');
    }

    if (assetIds.length > 100) {
      throw new BadRequestException('Bulk print is limited to 100 assets per request');
    }

    const assets = await this.assetRepository.find({
      where: { id: In(assetIds), tenantId },
      order: { name: 'ASC' },
    });

    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more selected assets were not found');
    }

    const orderedAssets = assetIds
      .map((assetId) => assets.find((asset) => asset.id === assetId))
      .filter((asset): asset is Asset => !!asset);

    return this.buildQrPdf(orderedAssets);
  }

  async resolveAssetTagToken(
    token: string,
    tenantId: string,
  ): Promise<Pick<Asset, 'id' | 'name' | 'assetNumber' | 'status'> & { location: string | null }> {
    const asset = await this.assetRepository.findOne({
      where: { assetTagToken: token, tenantId },
      relations: ['location'],
    });

    if (!asset) {
      throw new NotFoundException('Asset tag not found');
    }

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

    return {
      id: asset.id,
      name: asset.name,
      assetNumber: asset.assetNumber,
      status: asset.status,
      location: asset.location?.name || null,
    };
  }

  async generateQrCode(assetId: string, tenantId: string): Promise<string> {
    const metadata = await this.getAssetQr(assetId, tenantId);
    return metadata.assetTagPreviewUrl;
  }

  private async buildQrPdf(assets: Asset[]): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 36;
    const gap = 20;
    const columns = 2;
    const rows = 3;
    const cardWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
    const cardHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;

    let page = pdf.addPage([pageWidth, pageHeight]);

    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const slot = index % (columns * rows);
      if (index > 0 && slot === 0) {
        page = pdf.addPage([pageWidth, pageHeight]);
      }

      const column = slot % columns;
      const row = Math.floor(slot / columns);
      const x = margin + column * (cardWidth + gap);
      const y = pageHeight - margin - (row + 1) * cardHeight - row * gap;

      page.drawRectangle({
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        borderColor: rgb(0.82, 0.84, 0.87),
        borderWidth: 1,
      });

      const qrPng = await this.generateQrPng(this.buildAssetTagUrl(asset.assetTagToken), 320);
      const qrImage = await pdf.embedPng(qrPng);
      const qrSize = Math.min(cardWidth - 48, cardHeight - 110);

      page.drawImage(qrImage, {
        x: x + (cardWidth - qrSize) / 2,
        y: y + cardHeight - qrSize - 28,
        width: qrSize,
        height: qrSize,
      });

      page.drawText(asset.name, {
        x: x + 20,
        y: y + 44,
        size: 12,
        maxWidth: cardWidth - 40,
        font: boldFont,
        color: rgb(0.1, 0.12, 0.15),
      });

      page.drawText(asset.assetNumber || 'Unnumbered asset', {
        x: x + 20,
        y: y + 26,
        size: 10,
        maxWidth: cardWidth - 40,
        font,
        color: rgb(0.37, 0.41, 0.45),
      });
    }

    return Buffer.from(await pdf.save());
  }

  async uploadAssetImage(
    assetId: string,
    file: Express.Multer.File,
    userId: string,
    tenantId: string,
  ): Promise<{ key: string; url: string }> {
    const asset = await this.findOne(assetId, tenantId);

    // If the asset already has an image in customFields, delete the old one
    if (asset.customFields && asset.customFields.imageUrl) {
      try {
        await this.filesService.deleteFile(
          this.filesService.resolveStorageKey(asset.customFields.imageUrl as string),
        );
      } catch (error) {
        this.logger.error('Failed to delete old asset image:', error);
      }
    }

    const storageKey = await this.filesService.uploadFile(
      file,
      `assets/${assetId}/images`,
      tenantId,
    );

    // Update the asset with the new image URL in customFields
    if (!asset.customFields) {
      asset.customFields = {};
    }
    asset.customFields.imageUrl = storageKey;
    await this.assetRepository.save(asset);

    return {
      key: storageKey,
      url: await this.filesService.getSignedUrl(storageKey),
    };
  }

  // ==================== LOCATION METHODS ====================

  async createLocation(dto: CreateLocationDto, tenantId: string): Promise<Location> {
    const location = this.locationRepository.create({
      ...dto,
      tenantId,
    });
    return this.locationRepository.save(location);
  }

  async findAllLocations(tenantId: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async getLocationTree(tenantId: string): Promise<Location[]> {
    return this.locationRepository.find({
      where: { parentId: IsNull(), tenantId },
      relations: ['children', 'children.children', 'children.children.children'],
      order: { name: 'ASC' },
    });
  }

  async findLocationById(id: string, tenantId: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id, tenantId },
      relations: ['children'],
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async updateLocation(id: string, dto: UpdateLocationDto, tenantId: string): Promise<Location> {
    const location = await this.findLocationById(id, tenantId);
    Object.assign(location, dto);
    return this.locationRepository.save(location);
  }

  async deleteLocation(id: string, tenantId: string): Promise<void> {
    const location = await this.findLocationById(id, tenantId);

    const assetsUsingLocation = await this.assetRepository.count({
      where: { locationId: id, tenantId },
    });

    if (assetsUsingLocation > 0) {
      throw new BadRequestException(
        'Cannot delete location with associated assets',
      );
    }

    await this.locationRepository.remove(location);
  }

  // ==================== CATEGORY METHODS ====================

  async createCategory(dto: CreateCategoryDto, tenantId: string): Promise<AssetCategory> {
    const category = this.categoryRepository.create({
      ...dto,
      tenantId,
    });
    return this.categoryRepository.save(category);
  }

  async findAllCategories(tenantId: string): Promise<AssetCategory[]> {
    return this.categoryRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async getCategoryTree(tenantId: string): Promise<AssetCategory[]> {
    return this.categoryRepository.find({
      where: { parentId: IsNull(), tenantId },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });
  }

  async findCategoryById(id: string, tenantId: string): Promise<AssetCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, tenantId },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, tenantId: string): Promise<AssetCategory> {
    const category = await this.findCategoryById(id, tenantId);
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string, tenantId: string): Promise<void> {
    const category = await this.findCategoryById(id, tenantId);

    const assetsUsingCategory = await this.assetRepository.count({
      where: { categoryId: id, tenantId },
    });

    if (assetsUsingCategory > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated assets',
      );
    }

    await this.categoryRepository.remove(category);
  }

  // ==================== LOOKUP METHODS ====================

  async findByQrCode(qrCode: string, tenantId: string): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { qrCode, tenantId },
      relations: ['category', 'location'],
    });
  }

  async findByAssetTagToken(assetTagToken: string, tenantId: string): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { assetTagToken, tenantId },
      relations: ['category', 'location'],
    });
  }

  async findByAssetNumber(assetNumber: string, tenantId: string): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { assetNumber, tenantId },
      relations: ['category', 'location'],
    });
  }
}
