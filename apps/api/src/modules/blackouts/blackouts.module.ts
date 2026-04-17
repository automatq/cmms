import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlackoutPeriod } from './entities/blackout-period.entity';
import { Tenant } from '../users/entities/tenant.entity';
import { BlackoutsService } from './blackouts.service';
import { BlackoutsController, TenantWorkingDaysController } from './blackouts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BlackoutPeriod, Tenant])],
  providers: [BlackoutsService],
  controllers: [BlackoutsController, TenantWorkingDaysController],
  exports: [BlackoutsService],
})
export class BlackoutsModule {}
