import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddLaborDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  hours: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Travel time in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  travelTime?: number;

  @ApiPropertyOptional({ description: 'Wait/idle time in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  waitTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
