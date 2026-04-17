import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TriggerType, FrequencyUnit } from '../entities/pm-plan.entity';

export class CreatePmPlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  // Time-based
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  frequencyValue?: number;

  @ApiPropertyOptional({ enum: FrequencyUnit })
  @IsOptional()
  @IsEnum(FrequencyUnit)
  frequencyUnit?: FrequencyUnit;

  // Meter-based
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  meterInterval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meterUnit?: string;

  // Calendar-based
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  calendarDates?: string[];

  // First due date
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rollingSchedule?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignedTo?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  checklistTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ignoreBlackouts?: boolean;
}
