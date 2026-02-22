import { IsOptional, IsDateString, IsUUID, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
