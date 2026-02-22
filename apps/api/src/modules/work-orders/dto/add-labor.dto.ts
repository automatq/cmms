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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
