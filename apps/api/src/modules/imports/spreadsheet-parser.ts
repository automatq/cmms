import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseSpreadsheet(buffer: Buffer, filename: string): ParsedSpreadsheet {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('File is empty');
  }

  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new BadRequestException(`Unsupported file type: .${ext}. Use CSV, XLSX, or XLS.`);
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
  } catch (err) {
    throw new BadRequestException(`Failed to parse file: ${(err as Error).message}`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException('File contains no sheets');
  }
  const sheet = workbook.Sheets[sheetName];

  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (matrix.length < 2) {
    throw new BadRequestException('File must have a header row and at least one data row');
  }

  const headers = matrix[0].map((h) => String(h ?? '').trim()).filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new BadRequestException('File has no header columns');
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const rawRow = matrix[i];
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const value = rawRow[c];
      const str = value == null ? '' : String(value).trim();
      row[headers[c]] = str;
      if (str.length > 0) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }

  return { headers, rows };
}
