import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FilesService, SIGNED_URL_TTL_SECONDS } from './files.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/url'),
}));

const TENANT = '11111111-1111-1111-1111-111111111111';

function file(originalname: string, mimetype: string, size = 10): Express.Multer.File {
  return {
    originalname,
    mimetype,
    size,
    buffer: Buffer.alloc(size),
  } as Express.Multer.File;
}

describe('FilesService', () => {
  let service: FilesService;
  let send: jest.SpyInstance;
  let usageService: { enforceStorageLimit: jest.Mock };
  let tenantService: { updateStorageUsage: jest.Mock };

  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    const config = { get: (_k: string, def?: string) => def } as any;
    usageService = { enforceStorageLimit: jest.fn().mockResolvedValue(undefined) };
    tenantService = { updateStorageUsage: jest.fn().mockResolvedValue(undefined) };
    service = new FilesService(config, usageService as any, tenantService as any);
    send.mockClear();
    (getSignedUrl as jest.Mock).mockClear();
  });

  afterEach(() => {
    send.mockRestore();
  });

  function lastPut(): PutObjectCommand['input'] {
    const cmd = send.mock.calls.map((c) => c[0]).find((c) => c instanceof PutObjectCommand);
    expect(cmd).toBeDefined();
    return (cmd as PutObjectCommand).input;
  }

  describe('uploadFile', () => {
    it('derives the key extension and ContentType from the allowlist, not the client', async () => {
      const key = await service.uploadFile(file('Photo.JPEG', 'image/jpeg'), 'assets/a/images', TENANT);
      expect(key).toMatch(new RegExp(`^${TENANT}/assets/a/images/[0-9a-f-]{36}\\.jpg$`));
      const put = lastPut();
      expect(put.ContentType).toBe('image/jpeg');
      expect(put.ContentDisposition).toMatch(/^inline; filename="Photo.JPEG"/);
    });

    it('stores non inline-safe types as attachments with a sanitized filename', async () => {
      const key = await service.uploadFile(
        file('bad"name\r\n.csv', 'application/vnd.ms-excel'),
        'imports/assets',
        TENANT,
      );
      expect(key.endsWith('.csv')).toBe(true);
      const put = lastPut();
      expect(put.ContentType).toBe('text/csv');
      expect(put.ContentDisposition).toMatch(/^attachment; filename="badname.csv"/);
      expect(put.ContentDisposition).not.toMatch(/[\r\n]/);
    });

    it.each([
      ['x.html', 'text/html'],
      ['x.svg', 'image/svg+xml'],
      ['x.xhtml', 'application/xhtml+xml'],
      ['x.js', 'text/javascript'],
      ['x.png', 'text/html'],
      ['x.html', 'image/png'],
    ])('rejects %s (%s) without storing', async (name, mime) => {
      await expect(service.uploadFile(file(name, mime), 'uploads', TENANT)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(send).not.toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('enforces the tenant storage quota before storing and records usage after', async () => {
      await service.uploadFile(file('a.pdf', 'application/pdf', 1234), 'uploads', TENANT);
      expect(usageService.enforceStorageLimit).toHaveBeenCalledWith(TENANT, 1234);
      expect(tenantService.updateStorageUsage).toHaveBeenCalledWith(TENANT, 1234);
    });

    it('does not store when over quota', async () => {
      usageService.enforceStorageLimit.mockRejectedValueOnce(new ForbiddenException('full'));
      await expect(
        service.uploadFile(file('a.pdf', 'application/pdf'), 'uploads', TENANT),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(send).not.toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(tenantService.updateStorageUsage).not.toHaveBeenCalled();
    });

    it('honours a narrower extension allowlist', async () => {
      await expect(
        service.uploadFile(file('a.pdf', 'application/pdf'), 'imports/x', TENANT, ['csv', 'xlsx', 'xls']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getSignedUrl', () => {
    function lastGetInput(): GetObjectCommand['input'] {
      const [, cmd, opts] = (getSignedUrl as jest.Mock).mock.calls.slice(-1)[0];
      expect(opts.expiresIn).toBe(SIGNED_URL_TTL_SECONDS);
      return (cmd as GetObjectCommand).input;
    }

    it('serves inline-safe images inline with the canonical type and a 1h expiry', async () => {
      await service.getSignedUrl(`${TENANT}/assets/a/images/x.png`);
      const input = lastGetInput();
      expect(SIGNED_URL_TTL_SECONDS).toBe(3600);
      expect(input.ResponseContentType).toBe('image/png');
      expect(input.ResponseContentDisposition).toBe('inline');
    });

    it('forces attachment for non inline-safe types, using the supplied filename', async () => {
      await service.getSignedUrl(`${TENANT}/work-orders/w/attachments/x.docx`, { filename: 'Spec' });
      const input = lastGetInput();
      expect(input.ResponseContentType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(input.ResponseContentDisposition).toMatch(/^attachment; filename="Spec.docx"/);
    });

    it('serves legacy objects with unknown/unsafe extensions as octet-stream attachments', async () => {
      await service.getSignedUrl(`${TENANT}/uploads/legacy.html`);
      const input = lastGetInput();
      expect(input.ResponseContentType).toBe('application/octet-stream');
      expect(input.ResponseContentDisposition).toMatch(/^attachment;/);
    });
  });

  describe('getFileObject', () => {
    it('returns the canonical content type for the key, ignoring stored metadata', async () => {
      send.mockResolvedValueOnce({ Body: 'stream', ContentType: 'text/html', ContentLength: 5 } as never);
      const obj = await service.getFileObject(`${TENANT}/uploads/legacy.html`);
      expect(obj.contentType).toBe('application/octet-stream');
      expect(obj.contentLength).toBe(5);
    });
  });
});
