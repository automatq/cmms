import { IsUUID, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class IssueStockDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  storeroomId: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;
}
