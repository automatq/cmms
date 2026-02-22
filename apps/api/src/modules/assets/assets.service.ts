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
  ) {}

  // ==================== ASSET METHODS ====================

  async create(dto: CreateAssetDto, userId: string): Promise<Asset> {
    const assetNumber = await this.generateAssetNumber();

    const asset = this.assetRepository.create({
      ...dto,
      assetNumber,
    });

    return this.assetRepository.save(asset);
  }

  async findAll(query: AssetQueryDto): Promise<PaginatedResult<Asset>> {
    const { page, limit, search, status, categoryId, locationId, parentId, isCritical } = query;

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location');

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

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['category', 'location', 'parent', 'children', 'documents'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return asset;
  }

  async findWithHistory(
    id: string,
  ): Promise<{ asset: Asset; meterHistory: AssetMeter[] }> {
    const asset = await this.findOne(id);
    const meterHistory = await this.meterRepository.find({
      where: { assetId: id },
      order: { recordedAt: 'DESC' },
      take: 50,
    });

    return { asset, meterHistory };
  }

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);
    Object.assign(asset, dto);
    return this.assetRepository.save(asset);
  }

  async retire(id: string, userId: string): Promise<Asset> {
    const asset = await this.findOne(id);
    asset.status = AssetStatus.RETIRED;
    asset.retiredAt = new Date();
    return this.assetRepository.save(asset);
  }

  async getHierarchy(): Promise<Asset[]> {
    return this.assetRepository.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });
  }

  async getChildren(parentId: string): Promise<Asset[]> {
    return this.assetRepository.find({
      where: { parentId },
      relations: ['category', 'location'],
      order: { name: 'ASC' },
    });
  }

  private async generateAssetNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastAsset = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.assetNumber LIKE :pattern', { pattern: `AST-${year}-%` })
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
  ): Promise<AssetMeter> {
    const asset = await this.findOne(assetId);

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
  ): Promise<AssetMeter[]> {
    const queryBuilder = this.meterRepository
      .createQueryBuilder('meter')
      .where('meter.assetId = :assetId', { assetId });

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
  ): Promise<AssetDocument> {
    const asset = await this.findOne(assetId);

    const storageKey = await this.filesService.uploadFile(
      file,
      `assets/${assetId}/documents`,
    );

    const doc = this.documentRepository.create({
      assetId,
      name: meta.name,
      type: meta.type,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: userId,
    });

    return this.documentRepository.save(doc);
  }

  async getDocumentSignedUrl(documentId: string): Promise<string> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return this.filesService.getSignedUrl(doc.storageKey);
  }

  async deleteDocument(documentId: string): Promise<void> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    await this.filesService.deleteFile(doc.storageKey);
    await this.documentRepository.remove(doc);
  }

  // ==================== QR CODE ====================

  async generateQrCode(assetId: string): Promise<string> {
    const asset = await this.findOne(assetId);
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
    );

    asset.qrCode = storageKey;
    await this.assetRepository.save(asset);

    return this.filesService.getSignedUrl(storageKey);
  }

  // ==================== LOCATION METHODS ====================

  async createLocation(dto: CreateLocationDto): Promise<Location> {
    const location = this.locationRepository.create(dto);
    return this.locationRepository.save(location);
  }

  async findAllLocations(): Promise<Location[]> {
    return this.locationRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getLocationTree(): Promise<Location[]> {
    return this.locationRepository.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children', 'children.children.children'],
      order: { name: 'ASC' },
    });
  }

  async findLocationById(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findLocationById(id);
    Object.assign(location, dto);
    return this.locationRepository.save(location);
  }

  async deleteLocation(id: string): Promise<void> {
    const location = await this.findLocationById(id);

    const assetsUsingLocation = await this.assetRepository.count({
      where: { locationId: id },
    });

    if (assetsUsingLocation > 0) {
      throw new BadRequestException(
        'Cannot delete location with associated assets',
      );
    }

    await this.locationRepository.remove(location);
  }

  // ==================== CATEGORY METHODS ====================

  async createCategory(dto: CreateCategoryDto): Promise<AssetCategory> {
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  async findAllCategories(): Promise<AssetCategory[]> {
    return this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getCategoryTree(): Promise<AssetCategory[]> {
    return this.categoryRepository.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });
  }

  async findCategoryById(id: string): Promise<AssetCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<AssetCategory> {
    const category = await this.findCategoryById(id);
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.findCategoryById(id);

    const assetsUsingCategory = await this.assetRepository.count({
      where: { categoryId: id },
    });

    if (assetsUsingCategory > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated assets',
      );
    }

    await this.categoryRepository.remove(category);
  }

  // ==================== LOOKUP METHODS ====================

  async findByQrCode(qrCode: string): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { qrCode },
      relations: ['category', 'location'],
    });
  }

  async findByAssetNumber(assetNumber: string): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { assetNumber },
      relations: ['category', 'location'],
    });
  }
}
