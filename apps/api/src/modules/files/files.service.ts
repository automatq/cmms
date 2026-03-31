import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';

@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(FilesService.name);
  private readonly ready: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<string>('STORAGE_PROVIDER', 'minio');

    if (provider === 's3') {
      // AWS S3 - uses default credential chain (env vars, IAM role, etc.)
      this.s3 = new S3Client({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });
    } else {
      // MinIO (S3-compatible) for local development
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'minio');
      const port = this.configService.get<string>('MINIO_PORT', '9000');
      const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      const accessKeyId =
        this.configService.get<string>('MINIO_ACCESS_KEY') ||
        this.configService.get<string>('MINIO_ROOT_USER', '');
      const secretAccessKey =
        this.configService.get<string>('MINIO_SECRET_KEY') ||
        this.configService.get<string>('MINIO_ROOT_PASSWORD', '');

      this.s3 = new S3Client({
        region: 'us-east-1',
        endpoint: `${protocol}://${endpoint}:${port}`,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

    this.bucket = this.configService.get<string>('STORAGE_BUCKET',
      this.configService.get<string>('MINIO_BUCKET', 'nexly-files'),
    );
    this.ready = this.ensureBucket();
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
          this.logger.log(`Created bucket: ${this.bucket}`);
        } catch (createError) {
          this.logger.error('Failed to create bucket:', createError);
        }
      } else {
        this.logger.error('Failed to check bucket:', error);
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    path: string,
    tenantId?: string,
  ): Promise<string> {
    await this.ready;
    const extension = file.originalname.split('.').pop();
    const prefix = tenantId ? `${tenantId}/` : '';
    const key = `${prefix}${path}/${uuid()}.${extension}`;

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentLength: file.size,
        ContentType: file.mimetype,
      }));

      return key;
    } catch (error) {
      this.logger.error('Upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
    tenantId?: string,
  ): Promise<string> {
    await this.ready;
    const actualKey = tenantId ? `${tenantId}/${key}` : key;
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: actualKey,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: contentType,
      }));

      return actualKey;
    } catch (error) {
      this.logger.error('Upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async getSignedUrl(key: string, expirySeconds = 86400): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3, command, { expiresIn: expirySeconds });
    } catch (error) {
      this.logger.error('Signed URL error:', error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  resolveStorageKey(value: string): string {
    if (!value || !/^https?:\/\//i.test(value)) {
      return value;
    }

    try {
      const parsed = new URL(value);
      const fileRouteMatch = parsed.pathname.match(/\/files\/(.+)\/download$/);
      if (fileRouteMatch?.[1]) {
        return decodeURIComponent(fileRouteMatch[1]);
      }

      const path = parsed.pathname.replace(/^\/+/, '');
      if (!path) {
        return value;
      }

      const segments = path.split('/');
      if (segments[0] === this.bucket) {
        return decodeURIComponent(segments.slice(1).join('/'));
      }

      return decodeURIComponent(path);
    } catch {
      return value;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (error) {
      this.logger.error('Delete error:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return response.Body as Readable;
    } catch (error) {
      this.logger.error('Get file error:', error);
      throw new InternalServerErrorException('Failed to get file');
    }
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Get file buffer error:', error);
      throw new InternalServerErrorException('Failed to get file');
    }
  }

  async copyFile(sourceKey: string, destKey: string): Promise<string> {
    try {
      await this.s3.send(new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destKey,
        CopySource: `${this.bucket}/${sourceKey}`,
      }));
      return destKey;
    } catch (error) {
      this.logger.error('Copy error:', error);
      throw new InternalServerErrorException('Failed to copy file');
    }
  }
}
