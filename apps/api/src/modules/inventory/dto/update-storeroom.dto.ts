import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreroomDto } from './create-storeroom.dto';

export class UpdateStoreroomDto extends PartialType(CreateStoreroomDto) {}
