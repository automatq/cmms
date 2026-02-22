import { IsUUID, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivePOLineItemDto {
  @IsUUID()
  lineItemId: string;

  @IsNumber()
  @Min(0)
  qtyReceived: number;
}

export class ReceivePODto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePOLineItemDto)
  lineItems: ReceivePOLineItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
