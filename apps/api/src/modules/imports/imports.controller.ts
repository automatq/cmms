import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  requireFile,
  SPREADSHEET_EXTENSIONS,
  spreadsheetUploadOptions,
} from '../../common/uploads/upload-options';
import { ApiTags } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { ImportType } from './entities/import-job.entity';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FilesService } from '../files/files.service';
import { parseSpreadsheet } from './spreadsheet-parser';

@ApiTags('Imports')
@RequireFeature('dataImport')
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly filesService: FilesService,
  ) {}

  @Get()
  @Permissions('settings:write')
  findAll(@CurrentUser() user: RequestUser) {
    return this.importsService.findAll(user.tenantId);
  }

  @Post(':type/preview')
  @Permissions('settings:write')
  @UseInterceptors(FileInterceptor('file', spreadsheetUploadOptions))
  async previewImport(
    @Param('type') type: ImportType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    requireFile(file);
    return this.importsService.previewImport(type, file.buffer, file.originalname, user.tenantId);
  }

  @Post(':type')
  @Permissions('settings:write')
  @UseInterceptors(FileInterceptor('file', spreadsheetUploadOptions))
  async startImport(
    @Param('type') type: ImportType,
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMappingStr: string,
    @CurrentUser() user: RequestUser,
  ) {
    requireFile(file);
    const columnMapping = parseColumnMapping(columnMappingStr);

    // Parse (and validate) before storing anything.
    const { rows } = parseSpreadsheet(file.buffer, file.originalname);

    const storageKey = await this.filesService.uploadFile(
      file,
      `imports/${type}`,
      user.tenantId,
      SPREADSHEET_EXTENSIONS,
    );

    return this.importsService.startImport(
      type,
      storageKey,
      file.originalname,
      columnMapping,
      rows.length,
      user.userId,
      user.tenantId,
    );
  }

  @Get(':id')
  @Permissions('settings:write')
  getStatus(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.importsService.getImportStatus(id, user.tenantId);
  }

  @Get(':id/errors')
  @Permissions('settings:write')
  getErrors(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.importsService.getImportErrors(id, user.tenantId);
  }
}

const MAX_MAPPING_ENTRIES = 500;

/** Parse the `columnMapping` form field into a flat string->string map. */
export function parseColumnMapping(raw: string | undefined | null): Record<string, string> {
  if (raw === undefined || raw === null || raw === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('columnMapping must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('columnMapping must be an object');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length > MAX_MAPPING_ENTRIES) {
    throw new BadRequestException('columnMapping has too many entries');
  }
  const mapping: Record<string, string> = Object.create(null);
  for (const [key, value] of entries) {
    if (typeof value !== 'string') {
      throw new BadRequestException('columnMapping values must be strings');
    }
    mapping[key] = value;
  }
  return mapping;
}
