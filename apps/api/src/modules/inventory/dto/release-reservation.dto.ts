import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class ReleaseReservationDto {
  @IsUUID()
  partId: string;

  @IsUUID()
  storeroomId: string;

  @IsUUID()
  workOrderId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number; // If not provided, releases all reserved qty for this WO
}
