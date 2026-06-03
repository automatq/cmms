import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContractType,
  RenewalType,
  ContractStatus,
} from '../entities/service-contract.entity';

export class CreateServiceContractDto {
  @IsUUID()
  supplierId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  @IsEnum(ContractType)
  type: ContractType;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsEnum(RenewalType)
  renewalType?: RenewalType;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaResponseHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaResolutionHours?: number;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  assetIds?: string[];
}
