import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { UsageService } from '../billing/usage.service';
import { TenantService } from '../../common/tenant/tenant.service';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly usageService: UsageService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Query('path') path?: string,
  ) {
    await this.usageService.enforceStorageLimit(user.tenantId, file.size);
    const key = await this.filesService.uploadFile(file, path || 'uploads', user.tenantId);
    await this.tenantService.updateStorageUsage(user.tenantId, file.size);
    return {
      key,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Get(':key/url')
  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL' })
  async getSignedUrl(@Param('key') key: string) {
    const url = await this.filesService.getSignedUrl(decodeURIComponent(key));
    return { url };
  }

  @Get(':key/download')
  @ApiOperation({ summary: 'Download file directly (authenticated)' })
  @ApiResponse({ status: 200, description: 'File stream' })
  async downloadFile(
    @Param('key') key: string,
    @Res() res: Response,
  ) {
    const stream = await this.filesService.getFileStream(decodeURIComponent(key));
    stream.pipe(res);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(@Param('key') key: string) {
    await this.filesService.deleteFile(decodeURIComponent(key));
    return { success: true };
  }
}
