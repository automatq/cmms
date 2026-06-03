import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
