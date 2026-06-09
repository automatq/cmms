import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, IsDateString, MaxLength } from 'class-validator';

export class IngestSensorReadingDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ description: 'Metric/channel name, e.g. temperature, vibration, pressure' })
  @IsString()
  @MaxLength(120)
  metric: string;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({ description: 'ISO timestamp; defaults to now' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Origin of the reading, e.g. gateway id' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
}
