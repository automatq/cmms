import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { Asset } from '../assets/entities/asset.entity';
import { PmHistory } from '../pm/entities/pm-history.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WorkOrder, Asset, PmHistory]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
