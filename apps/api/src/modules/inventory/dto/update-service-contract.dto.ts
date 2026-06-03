import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceContractDto } from './create-service-contract.dto';

export class UpdateServiceContractDto extends PartialType(CreateServiceContractDto) {}
