import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class AddPartDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  qtyUsed: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeroomId?: string;
}
