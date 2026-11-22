import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Shared multer option presets for every upload route.
 *
 * Each preset enforces:
 *  - a maximum file size (multer LIMIT_FILE_SIZE -> 413 via Nest's FileInterceptor),
 *  - a single file per request and bounded non-file fields,
 *  - an extension allowlist (from originalname, lowercased) AND a mimetype
 *    allowlist that must agree with that extension.
 *
 * Rejections are thrown as BadRequestException so clients receive a 400.
 */

export const MB = 1024 * 1024;

export const ATTACHMENT_MAX_BYTES = 50 * MB;
export const IMAGE_MAX_BYTES = 10 * MB;
export const SPREADSHEET_MAX_BYTES = 10 * MB;

interface FileTypeSpec {
  /** Canonical content type we store and serve the object with. */
  contentType: string;
  /** Canonical extension used in storage keys. */
  ext: string;
  /** Client-reported mimetypes accepted for this extension. */
  mimes: string[];
}

/**
 * Master table of file types the API will ever accept, keyed by lowercased
 * extension. Stored objects always use `contentType`/`ext` from this table,
 * never the client-supplied values.
 */
export const FILE_TYPES: Record<string, FileTypeSpec> = {
  jpg: { contentType: 'image/jpeg', ext: 'jpg', mimes: ['image/jpeg', 'image/jpg', 'image/pjpeg'] },
  jpeg: { contentType: 'image/jpeg', ext: 'jpg', mimes: ['image/jpeg', 'image/jpg', 'image/pjpeg'] },
  png: { contentType: 'image/png', ext: 'png', mimes: ['image/png'] },
  gif: { contentType: 'image/gif', ext: 'gif', mimes: ['image/gif'] },
  webp: { contentType: 'image/webp', ext: 'webp', mimes: ['image/webp'] },
  heic: { contentType: 'image/heic', ext: 'heic', mimes: ['image/heic', 'image/heif'] },
  heif: { contentType: 'image/heif', ext: 'heif', mimes: ['image/heif', 'image/heic'] },
  pdf: { contentType: 'application/pdf', ext: 'pdf', mimes: ['application/pdf'] },
  doc: { contentType: 'application/msword', ext: 'doc', mimes: ['application/msword'] },
  docx: {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  xls: {
    contentType: 'application/vnd.ms-excel',
    ext: 'xls',
    mimes: ['application/vnd.ms-excel', 'application/octet-stream'],
  },
  xlsx: {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
      'application/zip',
    ],
  },
  csv: {
    contentType: 'text/csv',
    ext: 'csv',
    mimes: ['text/csv', 'application/csv', 'text/x-csv', 'application/vnd.ms-excel', 'text/plain'],
  },
  txt: { contentType: 'text/plain', ext: 'txt', mimes: ['text/plain'] },
};

/** Types that are never accepted, regardless of extension. */
export const FORBIDDEN_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/xml',
  'application/xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'text/ecmascript',
]);

/** Content types that are safe for a browser to render inline. */
export const INLINE_SAFE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
export const SPREADSHEET_EXTENSIONS = ['csv', 'xlsx', 'xls'];
export const ATTACHMENT_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  'pdf',
  'doc',
  'docx',
  ...SPREADSHEET_EXTENSIONS,
  'txt',
];

export function getExtension(filename: string | undefined | null): string {
  if (!filename) return '';
  const base = filename.split(/[\\/]/).pop() || '';
  const idx = base.lastIndexOf('.');
  if (idx <= 0 || idx === base.length - 1) return '';
  return base.slice(idx + 1).toLowerCase();
}

export interface ResolvedFileType {
  ext: string;
  contentType: string;
}

/**
 * Resolve a client file (name + reported mimetype) to a canonical, safe type.
 * Returns null when the extension is not allowed, the mimetype is forbidden,
 * or the mimetype does not match the extension.
 */
export function resolveFileType(
  originalname: string | undefined | null,
  mimetype: string | undefined | null,
  allowedExtensions: readonly string[] = ATTACHMENT_EXTENSIONS,
): ResolvedFileType | null {
  const ext = getExtension(originalname);
  const mime = (mimetype || '').toLowerCase().split(';')[0].trim();
  if (!ext || !mime) return null;
  if (FORBIDDEN_MIME_TYPES.has(mime)) return null;
  if (!allowedExtensions.includes(ext)) return null;
  const spec = FILE_TYPES[ext];
  if (!spec || !spec.mimes.includes(mime)) return null;
  return { ext: spec.ext, contentType: spec.contentType };
}

/** Canonical content type for a storage key, based on its extension. */
export function contentTypeForKey(key: string): string {
  const spec = FILE_TYPES[getExtension(key)];
  return spec ? spec.contentType : 'application/octet-stream';
}

export function isInlineSafe(contentType: string): boolean {
  return INLINE_SAFE_CONTENT_TYPES.has(contentType);
}

/**
 * Build a Content-Disposition header value with an ASCII fallback filename
 * and an RFC 5987 encoded `filename*` parameter.
 */
export function buildContentDisposition(
  type: 'attachment' | 'inline',
  filename?: string | null,
): string {
  const cleaned = sanitizeFilename(filename);
  if (!cleaned) return type;
  const ascii = cleaned.replace(/[^\x20-\x7e]/g, '_').replace(/["\\%]/g, '_');
  const encoded = encodeURIComponent(cleaned).replace(
    /['()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export function sanitizeFilename(filename?: string | null): string {
  if (!filename) return '';
  const base = filename.split(/[\\/]/).pop() || '';
  // Strip control characters (incl. CR/LF) and quotes; cap the length.
  return base
    .replace(/[\x00-\x1f\x7f"]/g, '')
    .trim()
    .slice(0, 200);
}

type MulterFileFilter = NonNullable<MulterOptions['fileFilter']>;

export function createFileFilter(
  allowedExtensions: readonly string[],
  label: string,
): MulterFileFilter {
  return (_req, file, cb) => {
    if (resolveFileType(file.originalname, file.mimetype, allowedExtensions)) {
      cb(null, true);
      return;
    }
    cb(
      new BadRequestException(
        `Unsupported file type. Allowed ${label}: ${allowedExtensions.map((e) => '.' + e).join(', ')}`,
      ),
      false,
    );
  };
}

/** Work-order attachments, asset documents and generic uploads. */
export const attachmentUploadOptions: MulterOptions = {
  limits: {
    fileSize: ATTACHMENT_MAX_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 64 * 1024,
    parts: 25,
  },
  fileFilter: createFileFilter(ATTACHMENT_EXTENSIONS, 'file types'),
};

/** Image-only uploads (asset images, checklist photos). */
export const imageUploadOptions: MulterOptions = {
  limits: {
    fileSize: IMAGE_MAX_BYTES,
    files: 1,
    fields: 10,
    fieldSize: 16 * 1024,
    parts: 15,
  },
  fileFilter: createFileFilter(IMAGE_EXTENSIONS, 'image types'),
};

/** Throw a 400 when a multipart request carried no file. */
export function requireFile(file: Express.Multer.File | undefined | null): Express.Multer.File {
  if (!file || !file.buffer) {
    throw new BadRequestException('No file uploaded');
  }
  return file;
}

/** CSV / Excel imports. */
export const spreadsheetUploadOptions: MulterOptions = {
  limits: {
    fileSize: SPREADSHEET_MAX_BYTES,
    files: 1,
    fields: 10,
    // columnMapping JSON travels as a form field.
    fieldSize: 64 * 1024,
    parts: 15,
  },
  fileFilter: createFileFilter(SPREADSHEET_EXTENSIONS, 'spreadsheet types'),
};
