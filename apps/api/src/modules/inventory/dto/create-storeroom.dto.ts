import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength } from 'class-validator';

export class CreateStoreroomDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
