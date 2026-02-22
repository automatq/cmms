import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordMeterDto {
  @ApiProperty()
  @IsNumber()
  reading: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
