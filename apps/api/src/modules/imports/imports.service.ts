import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImportJob, ImportType, ImportStatus } from './entities/import-job.entity';
import { FilesService } from '../files/files.service';

// Expected column names per import type
const EXPECTED_COLUMNS: Record<ImportType, string[]> = {
  [ImportType.ASSETS]: ['name', 'assetNumber', 'serialNumber', 'status', 'categoryName', 'locationName', 'manufacturer', 'model', 'purchaseDate', 'purchaseCost', 'warrantyExpiry'],
  [ImportType.LOCATIONS]: ['name', 'address', 'parentName'],
  [ImportType.PARTS]: ['name', 'sku', 'description', 'unitCost', 'reorderPoint', 'supplierName'],
  [ImportType.WORK_ORDERS]: ['title', 'description', 'type', 'priority', 'assetNumber', 'locationName'],
};

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    @InjectQueue('data-imports')
    private readonly importQueue: Queue,
    private readonly filesService: FilesService,
    private readonly dataSource: DataSource,
  ) {}

  async previewImport(
    type: ImportType,
    csvContent: string,
    tenantId: string,
  ): Promise<{
    headers: string[];
    availableFields: string[];
    suggestedMapping: Record<string, string>;
    previewRows: Record<string, string>[];
    totalRows: number;
  }> {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = this.parseCsvLine(lines[0]);
    const suggestedMapping = this.suggestColumnMapping(headers, type);
    const previewRows = lines.slice(1, 11).map((line) => {
      const values = this.parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });
      return row;
    });

    return {
      headers,
      availableFields: EXPECTED_COLUMNS[type],
      suggestedMapping,
      previewRows,
      totalRows: lines.length - 1,
    };
  }

  async startImport(
    type: ImportType,
    storageKey: string,
    columnMapping: Record<string, string>,
    totalRows: number,
    userId: string,
    tenantId: string,
  ): Promise<ImportJob> {
    const job = this.importJobRepo.create({
      type,
      storageKey,
      columnMapping,
      totalRows,
      uploadedBy: userId,
      tenantId,
    });

    const savedJob = await this.importJobRepo.save(job);

    await this.importQueue.add('process-import', {
      jobId: savedJob.id,
      type,
      storageKey,
      columnMapping,
      tenantId,
    }, {
      attempts: 1, // Don't retry — partial imports could cause duplicates
    });

    return savedJob;
  }

  async getImportStatus(id: string, tenantId: string): Promise<ImportJob> {
    const job = await this.importJobRepo.findOne({ where: { id, tenantId } });
    if (!job) throw new NotFoundException(`Import job ${id} not found`);
    return job;
  }

  async getImportErrors(id: string, tenantId: string): Promise<{ row: number; errors: string[] }[]> {
    const job = await this.getImportStatus(id, tenantId);
    return job.errorDetails || [];
  }

  async findAll(tenantId: string): Promise<ImportJob[]> {
    return this.importJobRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async processImport(jobId: string, type: ImportType, storageKey: string, columnMapping: Record<string, string>, tenantId: string): Promise<void> {
    const job = await this.importJobRepo.findOne({ where: { id: jobId, tenantId } });
    if (!job) return;

    job.status = ImportStatus.PROCESSING;
    await this.importJobRepo.save(job);

    try {
      // Download CSV from storage
      const csvBuffer = await this.filesService.getFileBuffer(storageKey);
      const csvContent = csvBuffer.toString('utf-8');
      const lines = csvContent.split('\n').filter((l) => l.trim());

      if (lines.length < 2) {
        job.status = ImportStatus.FAILED;
        job.errorDetails = [{ row: 0, errors: ['CSV is empty or has no data rows'] }];
        await this.importJobRepo.save(job);
        return;
      }

      const headers = this.parseCsvLine(lines[0]);
      const errors: { row: number; errors: string[] }[] = [];
      let processedRows = 0;
      let errorRows = 0;

      // Process in batches of 50
      const batchSize = 50;
      for (let i = 1; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        for (let j = 0; j < batch.length; j++) {
          const rowNum = i + j;
          const values = this.parseCsvLine(batch[j]);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const mappedField = columnMapping[h];
            if (mappedField) {
              row[mappedField] = values[idx] || '';
            }
          });

          const rowErrors = this.validateRow(type, row, rowNum);
          if (rowErrors.length > 0) {
            errors.push({ row: rowNum, errors: rowErrors });
            errorRows++;
          } else {
            try {
              await this.insertRow(type, row, tenantId);
              processedRows++;
            } catch (error) {
              errors.push({ row: rowNum, errors: [(error as Error).message] });
              errorRows++;
            }
          }
        }

        // Update progress
        job.processedRows = processedRows;
        job.errorRows = errorRows;
        await this.importJobRepo.save(job);
      }

      job.status = ImportStatus.COMPLETED;
      job.processedRows = processedRows;
      job.errorRows = errorRows;
      job.errorDetails = errors.slice(0, 100); // Limit stored errors
      job.completedAt = new Date();
      await this.importJobRepo.save(job);
    } catch (error) {
      job.status = ImportStatus.FAILED;
      job.errorDetails = [{ row: 0, errors: [(error as Error).message] }];
      job.completedAt = new Date();
      await this.importJobRepo.save(job);
    }
  }

  private validateRow(type: ImportType, row: Record<string, string>, rowNum: number): string[] {
    const errors: string[] = [];

    switch (type) {
      case ImportType.ASSETS:
        if (!row.name?.trim()) errors.push('Name is required');
        break;
      case ImportType.LOCATIONS:
        if (!row.name?.trim()) errors.push('Name is required');
        break;
      case ImportType.PARTS:
        if (!row.name?.trim()) errors.push('Name is required');
        if (row.unitCost && isNaN(Number(row.unitCost))) errors.push('Unit cost must be a number');
        if (row.reorderPoint && isNaN(Number(row.reorderPoint))) errors.push('Reorder point must be a number');
        break;
      case ImportType.WORK_ORDERS:
        if (!row.title?.trim()) errors.push('Title is required');
        break;
    }

    return errors;
  }

  private async insertRow(type: ImportType, row: Record<string, string>, tenantId: string): Promise<void> {
    switch (type) {
      case ImportType.ASSETS:
        await this.dataSource.query(
          `INSERT INTO assets (id, tenant_id, name, asset_number, serial_number, status, manufacturer, model, purchase_date, purchase_cost, warranty_expiry, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())`,
          [
            tenantId,
            row.name,
            row.assetNumber || null,
            row.serialNumber || null,
            row.status || 'active',
            row.manufacturer || null,
            row.model || null,
            row.purchaseDate ? new Date(row.purchaseDate) : null,
            row.purchaseCost ? parseFloat(row.purchaseCost) : null,
            row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
          ],
        );
        break;
      case ImportType.LOCATIONS:
        await this.dataSource.query(
          `INSERT INTO locations (id, tenant_id, name, address, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, now(), now())`,
          [tenantId, row.name, row.address || null],
        );
        break;
      case ImportType.PARTS:
        await this.dataSource.query(
          `INSERT INTO parts (id, tenant_id, name, sku, description, unit_cost, reorder_point, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, now(), now())`,
          [
            tenantId,
            row.name,
            row.sku || null,
            row.description || null,
            row.unitCost ? parseFloat(row.unitCost) : null,
            row.reorderPoint ? parseInt(row.reorderPoint, 10) : null,
          ],
        );
        break;
      case ImportType.WORK_ORDERS:
        await this.dataSource.query(
          `INSERT INTO work_orders (id, tenant_id, title, description, type, priority, status, wo_number, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 'draft', $6, now(), now())`,
          [
            tenantId,
            row.title,
            row.description || null,
            row.type || 'corrective',
            row.priority || 'medium',
            `WO-IMP-${Date.now()}`,
          ],
        );
        break;
    }
  }

  private suggestColumnMapping(headers: string[], type: ImportType): Record<string, string> {
    const expected = EXPECTED_COLUMNS[type];
    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const normalized = header.toLowerCase().replace(/[_\s-]/g, '');
      for (const field of expected) {
        const normalizedField = field.toLowerCase();
        if (normalized === normalizedField || normalized.includes(normalizedField) || normalizedField.includes(normalized)) {
          mapping[header] = field;
          break;
        }
      }
    }

    return mapping;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }
}
