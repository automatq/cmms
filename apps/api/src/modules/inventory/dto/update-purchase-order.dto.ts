import { IsOptional, IsString, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
