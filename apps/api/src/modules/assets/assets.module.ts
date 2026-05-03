import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  Asset,
  AssetCategory,
  AssetDocument,
  AssetDowntime,
  AssetMeter,
  AssetPart,
  AssetConditionLog,
  FailureCode,
  Location,
} from './entities';
import { ServiceContract } from '../inventory/entities/service-contract.entity';
import { AssetsService } from './assets.service';
import { DowntimeService } from './downtime.service';
import { WarrantyCheckProcessor } from './warranty-check.processor';
import {
  AssetsController,
  LocationsController,
  CategoriesController,
} from './assets.controller';
import { DowntimeController } from './downtime.controller';
import { AssetCsvController, LocationCsvController } from './csv.controller';
import { FilesModule } from '../files/files.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetCategory,
      AssetDocument,
      AssetDowntime,
      AssetMeter,
      AssetPart,
      AssetConditionLog,
      FailureCode,
      Location,
      ServiceContract,
    ]),
    BullModule.registerQueue({ name: 'warranty-checker' }),
    forwardRef(() => FilesModule),
    TenantModule,
    NotificationsModule,
  ],
  providers: [AssetsService, DowntimeService, WarrantyCheckProcessor],
  controllers: [AssetsController, DowntimeController, LocationsController, CategoriesController, AssetCsvController, LocationCsvController],
  exports: [AssetsService, DowntimeService],
})
export class AssetsModule {}
