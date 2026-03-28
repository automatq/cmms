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
import { PublicRequestsController } from './public-requests.controller';
import { Tenant } from '../users/entities/tenant.entity';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AssetsModule } from '../assets/assets.module';
import { ChecklistTemplate } from '../pm/entities/checklist-template.entity';
import { TenantModule } from '../../common/tenant/tenant.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      WoLabor,
      WoPart,
      WoAttachment,
      WoChecklistResult,
      WorkRequest,
      ChecklistTemplate,
      Tenant,
    ]),
    forwardRef(() => FilesModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => AssetsModule),
    forwardRef(() => WebhooksModule),
    TenantModule,
  ],
  providers: [WorkOrdersService],
  controllers: [WorkOrdersController, WorkRequestsController, PublicRequestsController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
