import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { BudgetService } from './budget.service';
import { ExportService } from './export.service';
import { BudgetCheckProcessor } from './budget-check.processor';
import { ReportExportProcessor } from './report-export.processor';
import { ReportsController } from './reports.controller';
import { BudgetController } from './budget.controller';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AssetDowntime } from '../assets/entities/asset-downtime.entity';
import { PmPlan } from '../pm/entities/pm-plan.entity';
import { PmHistory } from '../pm/entities/pm-history.entity';
import { Part } from '../inventory/entities/part.entity';
import { InventoryStock } from '../inventory/entities/inventory-stock.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';
import { MaintenanceBudget } from './entities/maintenance-budget.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      Asset,
      AssetDowntime,
      PmPlan,
      PmHistory,
      Part,
      InventoryStock,
      InventoryTransaction,
      MaintenanceBudget,
      ScheduledReport,
    ]),
    BullModule.registerQueue({ name: 'budget-checker' }),
    BullModule.registerQueue({ name: 'report-export' }),
    NotificationsModule,
    forwardRef(() => AssetsModule),
  ],
  controllers: [ReportsController, BudgetController],
  providers: [ReportsService, BudgetService, ExportService, BudgetCheckProcessor, ReportExportProcessor],
  exports: [ReportsService, BudgetService, ExportService],
})
export class ReportsModule {}
