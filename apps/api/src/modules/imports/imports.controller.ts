import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { ImportType } from './entities/import-job.entity';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FilesService } from '../files/files.service';

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
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Param('type') type: ImportType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    const csvContent = file.buffer.toString('utf-8');
    return this.importsService.previewImport(type, csvContent, user.tenantId);
  }

  @Post(':type')
  @Permissions('settings:write')
  @UseInterceptors(FileInterceptor('file'))
  async startImport(
    @Param('type') type: ImportType,
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMappingStr: string,
    @CurrentUser() user: RequestUser,
  ) {
    const columnMapping = JSON.parse(columnMappingStr || '{}');

    // Upload CSV to storage
    const storageKey = await this.filesService.uploadFile(
      file,
      `imports/${type}`,
      user.tenantId,
    );

    const lines = file.buffer.toString('utf-8').split('\n').filter((l) => l.trim());
    const totalRows = Math.max(0, lines.length - 1);

    return this.importsService.startImport(
      type,
      storageKey,
      columnMapping,
      totalRows,
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
