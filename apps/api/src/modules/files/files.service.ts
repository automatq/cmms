import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FilesService {
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'minio',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || '',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || '',
    });

    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'cmms-files';
    this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
      }
    } catch (error) {
      console.error('Failed to ensure bucket exists:', error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    path: string,
  ): Promise<string> {
    const extension = file.originalname.split('.').pop();
    const key = `${path}/${uuid()}.${extension}`;

    try {
      await this.minioClient.putObject(
        this.bucket,
        key,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      return key;
    } catch (error) {
      console.error('MinIO upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucket,
        key,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
        },
      );

      return key;
    } catch (error) {
      console.error('MinIO upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getSignedUrl(key: string, expirySeconds = 86400): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucket,
        key,
        expirySeconds,
      );
    } catch (error) {
      console.error('MinIO signed URL error:', error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
    } catch (error) {
      console.error('MinIO delete error:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    try {
      return await this.minioClient.getObject(this.bucket, key);
    } catch (error) {
      console.error('MinIO get error:', error);
      throw new InternalServerErrorException('Failed to get file');
    }
  }

  async copyFile(sourceKey: string, destKey: string): Promise<string> {
    try {
      const conds = new Minio.CopyConditions();
      await this.minioClient.copyObject(
        this.bucket,
        destKey,
        `/${this.bucket}/${sourceKey}`,
        conds,
      );
      return destKey;
    } catch (error) {
      console.error('MinIO copy error:', error);
      throw new InternalServerErrorException('Failed to copy file');
    }
  }
}
