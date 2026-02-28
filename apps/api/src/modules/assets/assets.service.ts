import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
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
import { UsageService } from '../billing/usage.service';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class AssetsService {
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

  // ==================== ASSET METHODS ====================

  async create(dto: CreateAssetDto, userId: string, tenantId: string): Promise<Asset> {
    await this.usageService.enforceAssetLimit(tenantId);

    const assetNumber = await this.generateAssetNumber(tenantId);

    const asset = this.assetRepository.create({
      ...dto,
      assetNumber,
      tenantId,
    });

    const savedAsset = await this.assetRepository.save(asset);
    await this.tenantService.incrementAssetCount(tenantId);
    return savedAsset;
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

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id, tenantId },
      relations: ['category', 'location', 'parent', 'children', 'documents'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return asset;
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

    return { asset, meterHistory };
  }

  async update(id: string, dto: UpdateAssetDto, tenantId: string): Promise<Asset> {
    const asset = await this.findOne(id, tenantId);
    Object.assign(asset, dto);
    return this.assetRepository.save(asset);
  }

  async retire(id: string, userId: string, tenantId: string): Promise<Asset> {
    const asset = await this.findOne(id, tenantId);
    asset.status = AssetStatus.RETIRED;
    asset.retiredAt = new Date();
    return this.assetRepository.save(asset);
  }

  async getHierarchy(tenantId: string): Promise<Asset[]> {
    return this.assetRepository.find({
      where: { parentId: IsNull(), tenantId },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });
  }

  async getChildren(parentId: string, tenantId: string): Promise<Asset[]> {
    return this.assetRepository.find({
      where: { parentId, tenantId },
      relations: ['category', 'location'],
      order: { name: 'ASC' },
    });
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

  async generateQrCode(assetId: string, tenantId: string): Promise<string> {
    const asset = await this.findOne(assetId, tenantId);
    const url = `${this.configService.get('PUBLIC_URL')}/assets/${assetId}`;

    const qrBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
    });

    const storageKey = await this.filesService.uploadBuffer(
      qrBuffer,
      `assets/${assetId}/qr-code.png`,
      'image/png',
      tenantId,
    );

    asset.qrCode = storageKey;
    await this.assetRepository.save(asset);

    return this.filesService.getSignedUrl(storageKey);
  }

  async uploadAssetImage(
    assetId: string,
    file: Express.Multer.File,
    userId: string,
    tenantId: string,
  ): Promise<string> {
    const asset = await this.findOne(assetId, tenantId);

    // If the asset already has an image in customFields, delete the old one
    if (asset.customFields && asset.customFields.imageUrl) {
      try {
        await this.filesService.deleteFile(asset.customFields.imageUrl as string);
      } catch (error) {
        console.error('Failed to delete old asset image:', error);
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

    return this.filesService.getSignedUrl(storageKey);
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

  async findByAssetNumber(assetNumber: string, tenantId: string): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { assetNumber, tenantId },
      relations: ['category', 'location'],
    });
  }
}
