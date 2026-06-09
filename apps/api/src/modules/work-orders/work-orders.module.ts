import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  WorkOrder,
  WoLabor,
  WoPart,
  WoAttachment,
  WoChecklistResult,
  WoComment,
  WorkRequest,
  WoTemplate,
  WoAssignee,
} from './entities';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController, WorkRequestsController } from './work-orders.controller';
import { PublicRequestsController } from './public-requests.controller';
import { SlaEscalationProcessor } from './sla-escalation.processor';
import { WoTemplatesService } from './wo-templates.service';
import { WoTemplatesController } from './wo-templates.controller';
import { Tenant } from '../users/entities/tenant.entity';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AssetsModule } from '../assets/assets.module';
import { ChecklistTemplate } from '../pm/entities/checklist-template.entity';
import { Asset } from '../assets/entities/asset.entity';
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
      WoComment,
      WorkRequest,
      WoTemplate,
      WoAssignee,
      ChecklistTemplate,
      Tenant,
      Asset,
    ]),
    BullModule.registerQueue({
      name: 'sla-escalation',
    }),
    forwardRef(() => FilesModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => InventoryModule),
    forwardRef(() => AssetsModule),
    forwardRef(() => WebhooksModule),
    TenantModule,
  ],
  providers: [WorkOrdersService, SlaEscalationProcessor, WoTemplatesService],
  controllers: [
    WorkOrdersController,
    WorkRequestsController,
    PublicRequestsController,
    WoTemplatesController,
  ],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
