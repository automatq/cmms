import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PmPlan, ChecklistTemplate, PmHistory, SensorReading } from './entities';
import { Asset } from '../assets/entities/asset.entity';
import { PmService } from './pm.service';
import { PmController, ChecklistTemplatesController } from './pm.controller';
import { SensorsController } from './sensors.controller';
import { PmSchedulerProcessor } from './pm-scheduler.processor';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BlackoutsModule } from '../blackouts/blackouts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PmPlan, ChecklistTemplate, PmHistory, SensorReading, Asset]),
    BullModule.registerQueue({
      name: 'pm-scheduler',
    }),
    forwardRef(() => WorkOrdersModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => WebhooksModule),
    BlackoutsModule,
  ],
  providers: [PmService, PmSchedulerProcessor],
  controllers: [PmController, ChecklistTemplatesController, SensorsController],
  exports: [PmService],
})
export class PmModule {}
