import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class ReserveStockDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  storeroomId: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsUUID()
  workOrderId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
