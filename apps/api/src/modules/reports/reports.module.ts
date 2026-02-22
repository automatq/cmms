import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { PmPlan } from '../pm/entities/pm-plan.entity';
import { PmHistory } from '../pm/entities/pm-history.entity';
import { Part } from '../inventory/entities/part.entity';
import { InventoryStock } from '../inventory/entities/inventory-stock.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      Asset,
      PmPlan,
      PmHistory,
      Part,
      InventoryStock,
      InventoryTransaction,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
