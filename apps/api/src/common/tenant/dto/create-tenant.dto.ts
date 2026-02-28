import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: 'Company/organization name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  @ApiProperty({ description: 'URL-friendly slug (lowercase, hyphens only)' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;

  @ApiProperty({ description: 'Admin user email' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ description: 'Admin user first name' })
  @IsString()
  @MinLength(1)
  adminFirstName: string;

  @ApiProperty({ description: 'Admin user last name' })
  @IsString()
  @MinLength(1)
  adminLastName: string;

  @ApiPropertyOptional({ description: 'Timezone (e.g., America/New_York)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Currency code (e.g., USD)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
