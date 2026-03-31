import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WorkOrderStatus, HoldReason } from '../entities/work-order.entity';

export class UpdateStatusDto {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;

  @ApiPropertyOptional({ enum: HoldReason, description: 'Required when status is on_hold' })
  @IsOptional()
  @IsEnum(HoldReason)
  holdReason?: HoldReason;
}
