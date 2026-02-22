import { IsUUID, IsArray, IsOptional, IsString, IsDateString, ValidateNested, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePOLineItemDto {
  @IsUUID()
  partId: string;

  @IsNumber()
  @Min(1)
  qtyOrdered: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsUUID()
  storeroomId: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  poNumber?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineItemDto)
  lineItems: CreatePOLineItemDto[];
}
