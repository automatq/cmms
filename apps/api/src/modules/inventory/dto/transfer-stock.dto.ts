import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class TransferStockDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  fromStoreroomId: string;

  @IsUUID()
  toStoreroomId: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
