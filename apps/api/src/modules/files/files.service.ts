import {
  BadRequestException,
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
import { UsageService } from '../../common/tenant/usage.service';
import { TenantService } from '../../common/tenant/tenant.service';
import {
  ATTACHMENT_EXTENSIONS,
  buildContentDisposition,
  contentTypeForKey,
  FORBIDDEN_MIME_TYPES,
  getExtension,
  isInlineSafe,
  resolveFileType,
} from '../../common/uploads/upload-options';

/** Default lifetime of presigned GET URLs (1 hour). */
export const SIGNED_URL_TTL_SECONDS = 3600;

export interface SignedUrlOptions {
  expiresIn?: number;
  /** Suggested download filename (used for attachment disposition). */
  filename?: string;
}

export interface StoredFileObject {
  stream: NodeJS.ReadableStream;
  /** Safe content type to serve with (canonical, never client-controlled). */
  contentType: string;
  contentLength?: number;
}

@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  // Separate client used only for generating presigned URLs against a
  // browser-reachable host. On Railway the API talks to MinIO over the
  // private network (maintek-minio.railway.internal), but presigned URLs
  // need a public origin like https://maintek-minio-production.up.railway.app
  // so <img src> in the browser resolves.
  private readonly s3UrlSigner: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(FilesService.name);
  private readonly ready: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly usageService: UsageService,
    private readonly tenantService: TenantService,
  ) {
    const provider = this.configService.get<string>('STORAGE_PROVIDER', 'minio');

    if (provider === 's3') {
      // AWS S3 - uses default credential chain (env vars, IAM role, etc.)
      this.s3 = new S3Client({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });
      this.s3UrlSigner = this.s3;
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

      const credentials = { accessKeyId, secretAccessKey };
      const internalEndpoint = `${protocol}://${endpoint}:${port}`;

      this.s3 = new S3Client({
        region: 'us-east-1',
        endpoint: internalEndpoint,
        forcePathStyle: true,
        credentials,
      });

      // MINIO_PUBLIC_ENDPOINT is the browser-reachable origin (full URL
      // including scheme). Falls back to the internal endpoint, which is
      // correct for local docker-compose where minio:9000 is reachable from
      // the host via port-forwarding.
      const publicEndpoint =
        this.configService.get<string>('MINIO_PUBLIC_ENDPOINT') || internalEndpoint;

      this.s3UrlSigner =
        publicEndpoint === internalEndpoint
          ? this.s3
          : new S3Client({
              region: 'us-east-1',
              endpoint: publicEndpoint,
              forcePathStyle: true,
              credentials,
            });
    }

    this.bucket = this.configService.get<string>('STORAGE_BUCKET',
      this.configService.get<string>('MINIO_BUCKET', 'maintek-files'),
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

  /**
   * Store an uploaded file. The storage key extension and the stored
   * Content-Type come from the server-side allowlist (validated against both
   * the client extension and mimetype), never from client input directly.
   * When a tenantId is given the tenant's storage quota is enforced and the
   * usage is recorded.
   */
  async uploadFile(
    file: Express.Multer.File,
    path: string,
    tenantId?: string,
    allowedExtensions: readonly string[] = ATTACHMENT_EXTENSIONS,
  ): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }
    const resolved = resolveFileType(file.originalname, file.mimetype, allowedExtensions);
    if (!resolved) {
      throw new BadRequestException('Unsupported file type');
    }

    if (tenantId) {
      await this.usageService.enforceStorageLimit(tenantId, file.size);
    }

    await this.ready;
    const prefix = tenantId ? `${tenantId}/` : '';
    const key = `${prefix}${path}/${uuid()}.${resolved.ext}`;
    const disposition = buildContentDisposition(
      isInlineSafe(resolved.contentType) ? 'inline' : 'attachment',
      file.originalname,
    );

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentLength: file.size,
        ContentType: resolved.contentType,
        ContentDisposition: disposition,
      }));
    } catch (error) {
      this.logger.error('Upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }

    if (tenantId) {
      try {
        await this.tenantService.updateStorageUsage(tenantId, file.size);
      } catch (error) {
        this.logger.error('Failed to record storage usage:', error);
      }
    }

    return key;
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
    tenantId?: string,
  ): Promise<string> {
    await this.ready;
    const actualKey = tenantId ? `${tenantId}/${key}` : key;
    // Server-generated content only; still never store a script-capable type.
    const keyType = contentTypeForKey(actualKey);
    const storedType = keyType !== 'application/octet-stream' ? keyType : contentType;
    if (FORBIDDEN_MIME_TYPES.has(storedType.toLowerCase().split(';')[0].trim())) {
      throw new BadRequestException('Unsupported file type');
    }
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: actualKey,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: storedType,
        ...(isInlineSafe(storedType) ? {} : { ContentDisposition: 'attachment' }),
      }));

      return actualKey;
    } catch (error) {
      this.logger.error('Upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Presigned GET URL. The response Content-Type is forced to the canonical
   * type for the key's extension (application/octet-stream if unknown), and
   * anything that is not inline-safe is served as an attachment.
   */
  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    const contentType = contentTypeForKey(key);
    const inline = isInlineSafe(contentType);
    const keyName = key.split('/').pop() || 'download';
    const keyExt = getExtension(keyName);
    let filename = options.filename || keyName;
    if (keyExt && getExtension(filename) !== keyExt) {
      filename = `${filename}.${keyExt}`;
    }
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: contentType,
        ResponseContentDisposition: inline
          ? 'inline'
          : buildContentDisposition('attachment', filename),
      });
      return await getSignedUrl(this.s3UrlSigner, command, {
        expiresIn: options.expiresIn ?? SIGNED_URL_TTL_SECONDS,
      });
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

  /**
   * Fetch an object for direct download. The returned content type is the
   * canonical type for the key's extension, never the stored client value.
   */
  async getFileObject(key: string): Promise<StoredFileObject> {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        stream: response.Body as Readable,
        contentType: contentTypeForKey(key),
        contentLength: response.ContentLength,
      };
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
