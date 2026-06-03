import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class QuickStartByQrDto {
  @ApiProperty()
  @IsString()
  token: string;
}
