import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AiGenerateChecklistDto {
  @IsString()
  @MaxLength(8000)
  description: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}
