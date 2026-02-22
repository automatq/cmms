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
import { FilesModule } from '../files/files.module';

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
  ],
  providers: [AssetsService],
  controllers: [AssetsController, LocationsController, CategoriesController],
  exports: [AssetsService],
})
export class AssetsModule {}
