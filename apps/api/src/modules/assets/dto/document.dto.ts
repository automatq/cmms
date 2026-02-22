import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DocumentType } from '../entities/asset-document.entity';

export class DocumentMetaDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}
