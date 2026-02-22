import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkOrder,
  WoLabor,
  WoPart,
  WoAttachment,
  WoChecklistResult,
  WorkRequest,
} from './entities';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController, WorkRequestsController } from './work-orders.controller';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      WoLabor,
      WoPart,
      WoAttachment,
      WoChecklistResult,
      WorkRequest,
    ]),
    forwardRef(() => FilesModule),
    forwardRef(() => NotificationsModule),
  ],
  providers: [WorkOrdersService],
  controllers: [WorkOrdersController, WorkRequestsController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
