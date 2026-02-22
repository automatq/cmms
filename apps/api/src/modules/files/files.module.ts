import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    }),
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
