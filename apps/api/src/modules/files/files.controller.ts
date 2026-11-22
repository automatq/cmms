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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  attachmentUploadOptions,
  buildContentDisposition,
  contentTypeForKey,
  requireFile,
} from '../../common/uploads/upload-options';
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

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', attachmentUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Query('path') path?: string,
  ) {
    requireFile(file);
    if (path !== undefined && (!/^[A-Za-z0-9_\-/]{1,200}$/.test(path) || path.startsWith('/'))) {
      throw new BadRequestException('Invalid upload path');
    }
    // uploadFile enforces the tenant storage quota and records usage.
    const key = await this.filesService.uploadFile(file, path || 'uploads', user.tenantId);
    const url = await this.filesService.getSignedUrl(key, { filename: file.originalname });
    return {
      key,
      url,
      name: file.originalname,
      mimeType: contentTypeForKey(key),
      size: file.size,
    };
  }

  @Get(':key/url')
  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiResponse({ status: 200, description: 'Signed URL' })
  async getSignedUrl(@Param('key') key: string, @CurrentUser() user: RequestUser) {
    const decodedKey = decodeURIComponent(key);
    this.validateFileAccess(decodedKey, user.tenantId);
    const url = await this.filesService.getSignedUrl(decodedKey);
    return { url };
  }

  @Get(':key/download')
  @ApiOperation({ summary: 'Download file directly (authenticated)' })
  @ApiResponse({ status: 200, description: 'File stream' })
  async downloadFile(
    @Param('key') key: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const decodedKey = decodeURIComponent(key);
    this.validateFileAccess(decodedKey, user.tenantId);
    const { stream, contentType, contentLength } =
      await this.filesService.getFileObject(decodedKey);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      buildContentDisposition('attachment', decodedKey.split('/').pop()),
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    if (contentLength != null) {
      res.setHeader('Content-Length', String(contentLength));
    }
    stream.pipe(res);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(@Param('key') key: string, @CurrentUser() user: RequestUser) {
    const decodedKey = decodeURIComponent(key);
    this.validateFileAccess(decodedKey, user.tenantId);
    await this.filesService.deleteFile(decodedKey);
    return { success: true };
  }

  private validateFileAccess(key: string, tenantId: string): void {
    if (key.includes('..') || key.startsWith('/')) {
      throw new BadRequestException('Invalid file key');
    }
    if (!key.startsWith(tenantId + '/')) {
      throw new ForbiddenException('Access denied to this file');
    }
  }
}
