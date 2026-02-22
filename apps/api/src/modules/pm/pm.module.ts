import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PmPlan, ChecklistTemplate, PmHistory } from './entities';
import { PmService } from './pm.service';
import { PmController, ChecklistTemplatesController } from './pm.controller';
import { PmSchedulerProcessor } from './pm-scheduler.processor';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PmPlan, ChecklistTemplate, PmHistory]),
    BullModule.registerQueue({
      name: 'pm-scheduler',
    }),
    forwardRef(() => WorkOrdersModule),
    forwardRef(() => NotificationsModule),
  ],
  providers: [PmService, PmSchedulerProcessor],
  controllers: [PmController, ChecklistTemplatesController],
  exports: [PmService],
})
export class PmModule {}
