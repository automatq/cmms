import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { Priority } from '../entities/work-order.entity';

export class CreatePublicWorkRequestDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitterName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  submitterEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitterPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
