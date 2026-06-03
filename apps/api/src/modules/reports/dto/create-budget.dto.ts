import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDate,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  periodStart: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  periodEnd: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty()
  @IsNumber()
  plannedAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  allocatedCategories?: Record<string, number>;
}
