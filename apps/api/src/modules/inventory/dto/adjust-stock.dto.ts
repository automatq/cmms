import { IsUUID, IsNumber, IsString, IsOptional, MaxLength } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  storeroomId: string;

  @IsNumber()
  adjustmentQty: number; // Can be positive or negative

  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;
}
