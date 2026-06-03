import { IsOptional, IsDateString, IsUUID, IsEnum, IsString, IsNumber, Min, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Multi-select query params can arrive in two forms over HTTP:
 *   ?locationIds=a&locationIds=b   (array)
 *   ?locationIds=a,b               (comma-separated string)
 * Normalize both into a string[].
 */
function csvOrArray(value: unknown): string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return undefined;
}

export enum ReportPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
}

export class DateRangeDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class ReportQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(ReportPeriod)
  groupBy?: ReportPeriod;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // Multi-select counterparts of the singular IDs above. Accept either
  // `?locationIds=a&locationIds=b` or `?locationIds=a,b`. When present
  // they take precedence over the singular IDs in the service layer.
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }) => csvOrArray(value))
  locationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }) => csvOrArray(value))
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }) => csvOrArray(value))
  technicianIds?: string[];

  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}

export class WorkOrderReportQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;
}

export class AssetReportQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class InventoryReportQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsUUID()
  storeroomId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

export class DashboardQueryDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
}
