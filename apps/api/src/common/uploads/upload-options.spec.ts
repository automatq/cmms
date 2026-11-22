import { BadRequestException, Controller, INestApplication, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  attachmentUploadOptions,
  buildContentDisposition,
  contentTypeForKey,
  imageUploadOptions,
  requireFile,
  resolveFileType,
  spreadsheetUploadOptions,
} from './upload-options';

type Filter = NonNullable<typeof attachmentUploadOptions.fileFilter>;

function runFilter(filter: Filter, originalname: string, mimetype: string) {
  return new Promise<{ error: unknown; accepted: boolean }>((resolve) => {
    filter({} as any, { originalname, mimetype } as Express.Multer.File, (error: any, accepted?: boolean) =>
      resolve({ error, accepted: !!accepted }),
    );
  });
}

describe('upload option presets', () => {
  describe('attachmentUploadOptions', () => {
    const filter = attachmentUploadOptions.fileFilter!;

    it.each([
      ['manual.pdf', 'application/pdf'],
      ['photo.PNG', 'image/png'],
      ['photo.jpeg', 'image/jpeg'],
      ['parts.csv', 'text/csv'],
      ['parts.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['spec.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['notes.txt', 'text/plain'],
    ])('accepts %s (%s)', async (name, mime) => {
      const { error, accepted } = await runFilter(filter, name, mime);
      expect(error).toBeNull();
      expect(accepted).toBe(true);
    });

    it.each([
      ['page.html', 'text/html'],
      ['page.htm', 'text/html'],
      ['logo.svg', 'image/svg+xml'],
      ['script.js', 'application/javascript'],
      ['page.xhtml', 'application/xhtml+xml'],
      ['noext', 'application/pdf'],
      ['archive.exe', 'application/octet-stream'],
    ])('rejects %s (%s) with BadRequestException', async (name, mime) => {
      const { error, accepted } = await runFilter(filter, name, mime);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(accepted).toBe(false);
    });

    it('rejects an allowed extension with a mismatched mimetype', async () => {
      expect((await runFilter(filter, 'image.png', 'text/html')).error).toBeInstanceOf(BadRequestException);
      expect((await runFilter(filter, 'doc.pdf', 'image/png')).error).toBeInstanceOf(BadRequestException);
    });

    it('rejects an allowed mimetype with a disallowed extension', async () => {
      expect((await runFilter(filter, 'image.html', 'image/png')).error).toBeInstanceOf(BadRequestException);
      expect((await runFilter(filter, 'image.png.svg', 'image/png')).error).toBeInstanceOf(BadRequestException);
    });

    it('caps size at 50MB and one file', () => {
      expect(attachmentUploadOptions.limits?.fileSize).toBe(50 * 1024 * 1024);
      expect(attachmentUploadOptions.limits?.files).toBe(1);
    });
  });

  describe('imageUploadOptions', () => {
    const filter = imageUploadOptions.fileFilter!;

    it('accepts images', async () => {
      expect((await runFilter(filter, 'a.png', 'image/png')).accepted).toBe(true);
      expect((await runFilter(filter, 'a.heic', 'image/heic')).accepted).toBe(true);
    });

    it('rejects non-images', async () => {
      expect((await runFilter(filter, 'a.pdf', 'application/pdf')).error).toBeInstanceOf(BadRequestException);
      expect((await runFilter(filter, 'a.svg', 'image/svg+xml')).error).toBeInstanceOf(BadRequestException);
    });

    it('caps size at 10MB', () => {
      expect(imageUploadOptions.limits?.fileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe('spreadsheetUploadOptions', () => {
    const filter = spreadsheetUploadOptions.fileFilter!;

    it('accepts csv/xlsx/xls including common browser mimetypes', async () => {
      expect((await runFilter(filter, 'a.csv', 'text/csv')).accepted).toBe(true);
      expect((await runFilter(filter, 'a.csv', 'application/vnd.ms-excel')).accepted).toBe(true);
      expect(
        (await runFilter(filter, 'a.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
          .accepted,
      ).toBe(true);
      expect((await runFilter(filter, 'a.xls', 'application/vnd.ms-excel')).accepted).toBe(true);
    });

    it('rejects other types', async () => {
      expect((await runFilter(filter, 'a.pdf', 'application/pdf')).error).toBeInstanceOf(BadRequestException);
      expect((await runFilter(filter, 'a.html', 'text/csv')).error).toBeInstanceOf(BadRequestException);
    });

    it('caps size at 10MB with bounded fields', () => {
      expect(spreadsheetUploadOptions.limits?.fileSize).toBe(10 * 1024 * 1024);
      expect(spreadsheetUploadOptions.limits?.files).toBe(1);
      expect(spreadsheetUploadOptions.limits?.fieldSize).toBeGreaterThan(0);
    });
  });

  describe('helpers', () => {
    it('resolveFileType returns canonical type and extension', () => {
      expect(resolveFileType('Photo.JPEG', 'image/jpeg')).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
      expect(resolveFileType('a.csv', 'application/vnd.ms-excel')).toEqual({ ext: 'csv', contentType: 'text/csv' });
      expect(resolveFileType('a.html', 'text/html')).toBeNull();
    });

    it('contentTypeForKey falls back to octet-stream for unknown extensions', () => {
      expect(contentTypeForKey('t/x/abc.png')).toBe('image/png');
      expect(contentTypeForKey('t/x/abc.html')).toBe('application/octet-stream');
      expect(contentTypeForKey('t/x/abc.svg')).toBe('application/octet-stream');
      expect(contentTypeForKey('t/x/abc')).toBe('application/octet-stream');
    });

    it('buildContentDisposition strips header-breaking characters and RFC 5987 encodes', () => {
      const value = buildContentDisposition('attachment', 'ré"port\r\nX-Evil: 1.pdf');
      expect(value).not.toMatch(/[\r\n]/);
      expect(value.startsWith('attachment; filename="')).toBe(true);
      expect(value).toContain("filename*=UTF-8''r%C3%A9portX-Evil%3A%201.pdf");
      expect(buildContentDisposition('attachment', '')).toBe('attachment');
    });

    it('requireFile throws BadRequest when no file was sent', () => {
      expect(() => requireFile(undefined)).toThrow(BadRequestException);
    });
  });
});

@Controller('t')
class TestUploadController {
  @Post('sheet')
  @UseInterceptors(FileInterceptor('file', spreadsheetUploadOptions))
  sheet(@UploadedFile() file: Express.Multer.File) {
    return { size: requireFile(file).size };
  }
}

describe('upload presets through FileInterceptor', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [TestUploadController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid csv', async () => {
    const res = await request(app.getHttpServer())
      .post('/t/sheet')
      .attach('file', Buffer.from('name\nfoo\n'), { filename: 'a.csv', contentType: 'text/csv' });
    expect(res.status).toBe(201);
  });

  it('returns 400 (not 500) for a disallowed type', async () => {
    const res = await request(app.getHttpServer())
      .post('/t/sheet')
      .attach('file', Buffer.from('<script>1</script>'), { filename: 'a.html', contentType: 'text/html' });
    expect(res.status).toBe(400);
  });

  it('returns 413 (not 500) for an oversized file', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0x61);
    const res = await request(app.getHttpServer())
      .post('/t/sheet')
      .attach('file', big, { filename: 'a.csv', contentType: 'text/csv' });
    expect(res.status).toBe(413);
  });

  it('returns 400 when more than one file is sent', async () => {
    const res = await request(app.getHttpServer())
      .post('/t/sheet')
      .attach('file', Buffer.from('a\n1\n'), { filename: 'a.csv', contentType: 'text/csv' })
      .attach('file', Buffer.from('a\n1\n'), { filename: 'b.csv', contentType: 'text/csv' });
    expect(res.status).toBe(400);
  });
});
