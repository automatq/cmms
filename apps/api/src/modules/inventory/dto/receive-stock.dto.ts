import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class ReceiveStockDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  storeroomId: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;
}
