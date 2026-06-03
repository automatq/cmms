import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
