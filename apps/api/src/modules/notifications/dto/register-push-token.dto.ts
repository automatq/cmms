import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ description: "Client platform, e.g. 'ios' | 'android' | 'web'" })
  @IsString()
  platform: string;
}
