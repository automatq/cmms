import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from './entities/part.entity';
import { Supplier } from './entities/supplier.entity';
import { Storeroom } from './entities/storeroom.entity';
import { InventoryStock } from './entities/inventory-stock.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoLineItem } from './entities/po-line-item.entity';
import { ServiceContract } from './entities/service-contract.entity';
import { InventoryService } from './inventory.service';
import { ServiceContractsService } from './service-contracts.service';
import {
  SuppliersController,
  PartsController,
  StoreroomsController,
  InventoryController,
  PurchaseOrdersController,
} from './inventory.controller';
import { ServiceContractsController } from './service-contracts.controller';
import { PartCsvController } from './csv.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Part,
      Supplier,
      Storeroom,
      InventoryStock,
      InventoryTransaction,
      PurchaseOrder,
      PoLineItem,
      ServiceContract,
    ]),
    NotificationsModule,
  ],
  controllers: [
    SuppliersController,
    PartsController,
    StoreroomsController,
    InventoryController,
    PurchaseOrdersController,
    ServiceContractsController,
    PartCsvController,
  ],
  providers: [InventoryService, ServiceContractsService],
  exports: [InventoryService, ServiceContractsService],
})
export class InventoryModule {}
