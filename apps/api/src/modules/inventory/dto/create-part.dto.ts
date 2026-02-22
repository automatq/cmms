import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID, Min, MaxLength, IsArray } from 'class-validator';

export class CreatePartDto {
  @IsString()
  @MaxLength(100)
  sku: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsString()
  @MaxLength(50)
  unitOfMeasure: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturerPartNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  reorderQty?: number;

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  compatibleAssetIds?: string[];
}
