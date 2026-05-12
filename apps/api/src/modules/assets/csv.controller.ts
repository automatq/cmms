import {
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'fast-csv';
import { Asset, AssetStatus } from './entities/asset.entity';
import { Location } from './entities/location.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { parseSpreadsheet } from '../imports/spreadsheet-parser';

@ApiTags('Assets CSV')
@ApiBearerAuth()
@Controller('assets/csv')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetCsvController {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(AssetCategory)
    private readonly categoryRepository: Repository<AssetCategory>,
  ) {}

  @Get('export')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Export assets as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportAssets(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const assets = await this.assetRepository.find({
      where: { tenantId: user.tenantId },
      relations: ['location', 'category'],
      order: { name: 'ASC' },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=assets.csv');

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    for (const asset of assets) {
      csvStream.write({
        assetNumber: asset.assetNumber,
        name: asset.name,
        status: asset.status,
        location: asset.location?.name || '',
        category: asset.category?.name || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        purchaseDate: asset.purchaseDate || '',
        purchaseCost: asset.purchaseCost || '',
        warrantyExpiry: asset.warrantyExpiry || '',
        isCritical: asset.isCritical ? 'Yes' : 'No',
      });
    }

    csvStream.end();
  }

  @Post('import')
  @Permissions('assets:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import assets from CSV' })
  @ApiResponse({ status: 201, description: 'Import results' })
  async importAssets(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { rows } = parseSpreadsheet(file.buffer, file.originalname);
    const errors: { row: number; message: string }[] = [];

    const locations = await this.locationRepository.find({ where: { tenantId: user.tenantId } });
    const categories = await this.categoryRepository.find({ where: { tenantId: user.tenantId } });
    const locationMap = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.name) {
        errors.push({ row: rowNum, message: 'Name is required' });
        continue;
      }

      try {
        const asset = this.assetRepository.create({
          tenantId: user.tenantId,
          assetNumber: row.assetNumber || `IMPORT-${Date.now()}-${i}`,
          name: row.name,
          status: (row.status as AssetStatus) || AssetStatus.ACTIVE,
          manufacturer: row.manufacturer || undefined,
          model: row.model || undefined,
          serialNumber: row.serialNumber || undefined,
          purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
          purchaseCost: row.purchaseCost ? parseFloat(row.purchaseCost) : undefined,
          warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : undefined,
          isCritical: row.isCritical?.toLowerCase() === 'yes',
          locationId: row.location ? locationMap.get(row.location.toLowerCase()) : undefined,
          categoryId: row.category ? categoryMap.get(row.category.toLowerCase()) : undefined,
        });

        await this.assetRepository.save(asset);
        imported++;
      } catch (error) {
        errors.push({ row: rowNum, message: (error as Error).message });
      }
    }

    return { imported, errors, total: rows.length };
  }
}

@ApiTags('Locations CSV')
@ApiBearerAuth()
@Controller('locations/csv')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationCsvController {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  @Get('export')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Export locations as CSV' })
  async exportLocations(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const locations = await this.locationRepository.find({
      where: { tenantId: user.tenantId },
      order: { name: 'ASC' },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=locations.csv');

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    for (const loc of locations) {
      csvStream.write({
        name: loc.name,
        description: loc.description || '',
        address: loc.address || '',
      });
    }

    csvStream.end();
  }

  @Post('import')
  @Permissions('assets:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import locations from CSV' })
  async importLocations(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const { rows } = parseSpreadsheet(file.buffer, file.originalname);
    const errors: { row: number; message: string }[] = [];

    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name) {
        errors.push({ row: i + 2, message: 'Name is required' });
        continue;
      }

      try {
        const location = this.locationRepository.create({
          tenantId: user.tenantId,
          name: row.name,
          description: row.description || undefined,
          address: row.address || undefined,
        });
        await this.locationRepository.save(location);
        imported++;
      } catch (error) {
        errors.push({ row: i + 2, message: (error as Error).message });
      }
    }

    return { imported, errors, total: rows.length };
  }
}
