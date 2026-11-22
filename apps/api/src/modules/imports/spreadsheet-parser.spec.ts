import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { MAX_IMPORT_COLUMNS, MAX_IMPORT_ROWS, parseSpreadsheet } from './spreadsheet-parser';
import { parseColumnMapping } from './imports.controller';

jest.mock('xlsx', () => {
  const actual = jest.requireActual('xlsx');
  return { ...actual, read: jest.fn((...args: unknown[]) => actual.read(...args)) };
});

const readMock = XLSX.read as unknown as jest.Mock;

describe('parseSpreadsheet', () => {
  it('parses a simple csv', () => {
    const { headers, rows } = parseSpreadsheet(Buffer.from('name,sku\nBolt,B1\nNut,N1\n'), 'parts.csv');
    expect(headers).toEqual(['name', 'sku']);
    expect(rows).toEqual([
      { name: 'Bolt', sku: 'B1' },
      { name: 'Nut', sku: 'N1' },
    ]);
  });

  it('rejects csv files above the row cap', () => {
    const lines = ['name'];
    for (let i = 0; i < MAX_IMPORT_ROWS + 5; i++) lines.push(`row${i}`);
    expect(() => parseSpreadsheet(Buffer.from(lines.join('\n')), 'big.csv')).toThrow(/too many rows/);
  });

  it('accepts exactly the row cap', () => {
    const lines = ['name'];
    for (let i = 0; i < MAX_IMPORT_ROWS; i++) lines.push(`row${i}`);
    expect(parseSpreadsheet(Buffer.from(lines.join('\n')), 'ok.csv').rows).toHaveLength(MAX_IMPORT_ROWS);
  });

  it('clamps a forged sheet range instead of expanding it', () => {
    const ws = XLSX.utils.aoa_to_sheet([['name'], ['a'], ['b']]);
    ws['!ref'] = 'A1:XFD1048576';
    readMock.mockReturnValueOnce({ SheetNames: ['Sheet1'], Sheets: { Sheet1: ws } });
    const { rows } = parseSpreadsheet(Buffer.from('x'), 'forged.xlsx');
    expect(rows).toEqual([{ name: 'a' }, { name: 'b' }]);
    expect(ws['!ref']).toBe(`A1:${XLSX.utils.encode_col(MAX_IMPORT_COLUMNS - 1)}${MAX_IMPORT_ROWS + 2}`);
  });

  it('does not echo raw parser errors to the client', () => {
    readMock.mockImplementationOnce(() => {
      throw new Error('internal parser detail /srv/secret');
    });
    let caught: unknown;
    try {
      parseSpreadsheet(Buffer.from('x'), 'a.xlsx');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as Error).message).toBe('Could not parse file');
  });

  it('rejects unsupported extensions', () => {
    expect(() => parseSpreadsheet(Buffer.from('x'), 'a.html')).toThrow(BadRequestException);
  });
});

describe('parseColumnMapping', () => {
  it('returns {} for empty input', () => {
    expect(parseColumnMapping(undefined)).toEqual({});
    expect(parseColumnMapping('')).toEqual({});
  });

  it('parses a flat string map', () => {
    expect({ ...parseColumnMapping('{"Name":"name"}') }).toEqual({ Name: 'name' });
  });

  it.each(['{not json', '[]', '"str"', 'null', '{"a":1}', '{"a":{"b":"c"}}'])(
    'rejects %s with BadRequest',
    (raw) => {
      expect(() => parseColumnMapping(raw)).toThrow(BadRequestException);
    },
  );
});
