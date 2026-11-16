import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ReportFormat, ScheduledReportType } from '../entities/scheduled-report.entity';

/** Report types the export service can actually generate. */
export const SUPPORTED_SCHEDULED_REPORT_TYPES = [
  ScheduledReportType.WORK_ORDERS,
  ScheduledReportType.ASSETS,
  ScheduledReportType.PM_COMPLIANCE,
  ScheduledReportType.INVENTORY,
  ScheduledReportType.COSTS,
] as const;

// Five space-separated cron fields made of digits, '*', ',', '-' and '/'.
const CRON_PATTERN = /^\s*[\d*,\-/]+(\s+[\d*,\-/]+){4}\s*$/;

/**
 * Explicit DTO for scheduled reports. Previously the controller accepted
 * `Partial<ScheduledReport>`, which the global ValidationPipe cannot whitelist
 * (it erases to `Object` at runtime), so callers could set `tenantId` / `id`
 * and redirect another tenant's data to their own inbox.
 */
export class CreateScheduledReportDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: SUPPORTED_SCHEDULED_REPORT_TYPES })
  @IsIn(SUPPORTED_SCHEDULED_REPORT_TYPES as readonly string[])
  reportType: ScheduledReportType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiProperty({ example: '0 8 * * 1' })
  @IsString()
  @Matches(CRON_PATTERN, { message: 'schedule must be a 5-field cron expression' })
  schedule: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  recipientEmails: string[];

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScheduledReportDto extends PartialType(CreateScheduledReportDto) {}
