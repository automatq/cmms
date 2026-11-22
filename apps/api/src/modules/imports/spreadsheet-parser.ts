import { BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

/** Maximum data rows accepted per import (excluding the header row). */
export const MAX_IMPORT_ROWS = 10_000;
/** Maximum columns read from the first sheet. */
export const MAX_IMPORT_COLUMNS = 200;

const logger = new Logger('SpreadsheetParser');

export function parseSpreadsheet(buffer: Buffer, filename: string): ParsedSpreadsheet {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new BadRequestException(`Unsupported file type: .${ext}. Use CSV, XLSX, or XLS.`);
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: false,
      // Read one row past the cap so oversized files can be detected.
      sheetRows: MAX_IMPORT_ROWS + 2,
      // Only the first sheet is used.
      sheets: 0,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      bookVBA: false,
    });
  } catch (err) {
    logger.warn(`Failed to parse spreadsheet: ${(err as Error)?.message}`);
    throw new BadRequestException('Could not parse file');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException('File contains no sheets');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new BadRequestException('File contains no sheets');
  }

  // Clamp the sheet range so a forged "!ref" cannot blow up the conversion.
  const ref = sheet['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    range.e.r = Math.min(range.e.r, range.s.r + MAX_IMPORT_ROWS + 1);
    range.e.c = Math.min(range.e.c, range.s.c + MAX_IMPORT_COLUMNS - 1);
    sheet['!ref'] = XLSX.utils.encode_range(range);
  }

  let matrix: unknown[][];
  try {
    matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });
  } catch (err) {
    logger.warn(`Failed to read spreadsheet rows: ${(err as Error)?.message}`);
    throw new BadRequestException('Could not parse file');
  }

  if (matrix.length < 2) {
    throw new BadRequestException('File must have a header row and at least one data row');
  }
  if (matrix.length - 1 > MAX_IMPORT_ROWS) {
    throw new BadRequestException(
      `File has too many rows. A maximum of ${MAX_IMPORT_ROWS} data rows is supported per import.`,
    );
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
