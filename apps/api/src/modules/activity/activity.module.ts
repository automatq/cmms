import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechActivity } from './entities/tech-activity.entity';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { AssetsModule } from '../assets/assets.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WorkOrder } from '../work-orders/entities/work-order.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TechActivity, WorkOrder, User]),
    forwardRef(() => WorkOrdersModule),
    forwardRef(() => AssetsModule),
    RealtimeModule,
  ],
  providers: [ActivityService],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
