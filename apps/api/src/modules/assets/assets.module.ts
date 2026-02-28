import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Asset,
  AssetCategory,
  AssetDocument,
  AssetMeter,
  Location,
} from './entities';
import { AssetsService } from './assets.service';
import {
  AssetsController,
  LocationsController,
  CategoriesController,
} from './assets.controller';
import { AssetCsvController, LocationCsvController } from './csv.controller';
import { FilesModule } from '../files/files.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetCategory,
      AssetDocument,
      AssetMeter,
      Location,
    ]),
    forwardRef(() => FilesModule),
    BillingModule,
  ],
  providers: [AssetsService],
  controllers: [AssetsController, LocationsController, CategoriesController, AssetCsvController, LocationCsvController],
  exports: [AssetsService],
})
export class AssetsModule {}
