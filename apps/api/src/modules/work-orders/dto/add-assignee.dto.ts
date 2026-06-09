import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddAssigneeDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
