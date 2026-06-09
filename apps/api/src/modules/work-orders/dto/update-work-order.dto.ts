import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { WorkOrderType, Priority, WorkOrderStatus, HoldReason } from '../entities/work-order.entity';

export class UpdateWorkOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: WorkOrderType })
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'User id to assign the work order to; null to unassign' })
  @IsOptional()
  // Allow null/'' (unassign); only validate as UUID when a value is present.
  @ValidateIf((o) => o.assignedToId !== null && o.assignedToId !== '')
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @ApiPropertyOptional({ description: 'SLA target completion time; drives due-soon/overdue escalation' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({ enum: HoldReason })
  @IsOptional()
  @IsEnum(HoldReason)
  holdReason?: HoldReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  failureCodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
