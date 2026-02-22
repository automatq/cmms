import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEmail, IsEnum } from 'class-validator';
import { Priority } from '../entities/work-order.entity';

export class CreateWorkRequestDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submittedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  submitterEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitterPhone?: string;
}
