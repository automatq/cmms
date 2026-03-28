import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ImportJob } from './entities/import-job.entity';
import { ImportsService } from './imports.service';
import { ImportsProcessor } from './imports.processor';
import { ImportsController } from './imports.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportJob]),
    BullModule.registerQueue({ name: 'data-imports' }),
    forwardRef(() => FilesModule),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
