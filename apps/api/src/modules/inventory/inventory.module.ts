import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Part } from './entities/part.entity';
import { Supplier } from './entities/supplier.entity';
import { Storeroom } from './entities/storeroom.entity';
import { InventoryStock } from './entities/inventory-stock.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoLineItem } from './entities/po-line-item.entity';
import { InventoryService } from './inventory.service';
import {
  SuppliersController,
  PartsController,
  StoreroomsController,
  InventoryController,
  PurchaseOrdersController,
} from './inventory.controller';
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
    ]),
    NotificationsModule,
  ],
  controllers: [
    SuppliersController,
    PartsController,
    StoreroomsController,
    InventoryController,
    PurchaseOrdersController,
  ],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
