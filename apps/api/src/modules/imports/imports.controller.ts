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
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Param('type') type: ImportType,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.importsService.previewImport(type, file.buffer, file.originalname, user.tenantId);
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

    const storageKey = await this.filesService.uploadFile(
      file,
      `imports/${type}`,
      user.tenantId,
    );

    const { rows } = parseSpreadsheet(file.buffer, file.originalname);

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
