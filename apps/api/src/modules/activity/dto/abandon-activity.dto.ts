import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AbandonActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
