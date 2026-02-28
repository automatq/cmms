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
import { format, parse } from 'fast-csv';
import { Readable } from 'stream';
import { Part } from './entities/part.entity';
import { Supplier } from './entities/supplier.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

@ApiTags('Inventory CSV')
@ApiBearerAuth()
@Controller('parts/csv')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequireFeature('inventory')
export class PartCsvController {
  constructor(
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  @Get('export')
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Export parts as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportParts(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const parts = await this.partRepository.find({
      where: { tenantId: user.tenantId },
      relations: ['supplier'],
      order: { name: 'ASC' },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=parts.csv');

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    for (const part of parts) {
      csvStream.write({
        sku: part.sku,
        name: part.name,
        description: part.description || '',
        category: part.category || '',
        unitCost: part.unitCost || '',
        unitOfMeasure: part.unitOfMeasure || '',
        reorderPoint: part.reorderPoint || '',
        reorderQty: part.reorderQty || '',
        supplier: part.supplier?.name || '',
      });
    }

    csvStream.end();
  }

  @Post('import')
  @Permissions('inventory:write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import parts from CSV' })
  @ApiResponse({ status: 201, description: 'Import results' })
  async importParts(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const rows: any[] = [];
    const errors: { row: number; message: string }[] = [];

    const suppliers = await this.supplierRepository.find({ where: { tenantId: user.tenantId } });
    const supplierMap = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]));

    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer);
      stream
        .pipe(parse({ headers: true, trim: true }))
        .on('data', (row) => rows.push(row))
        .on('error', (error) => reject(new BadRequestException(`CSV parse error: ${error.message}`)))
        .on('end', async () => {
          let imported = 0;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            if (!row.name || !row.sku) {
              errors.push({ row: rowNum, message: 'Name and SKU are required' });
              continue;
            }

            try {
              const part = this.partRepository.create({
                tenantId: user.tenantId,
                sku: row.sku,
                name: row.name,
                description: row.description || undefined,
                category: row.category || undefined,
                unitCost: row.unitCost ? parseFloat(row.unitCost) : undefined,
                unitOfMeasure: row.unitOfMeasure || undefined,
                reorderPoint: row.reorderPoint ? parseInt(row.reorderPoint, 10) : undefined,
                reorderQty: row.reorderQty ? parseInt(row.reorderQty, 10) : undefined,
                supplierId: row.supplier ? supplierMap.get(row.supplier.toLowerCase()) : undefined,
              });

              await this.partRepository.save(part);
              imported++;
            } catch (error) {
              errors.push({ row: rowNum, message: (error as Error).message });
            }
          }

          resolve({ imported, errors, total: rows.length });
        });
    });
  }
}
