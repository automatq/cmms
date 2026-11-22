import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { TenantModule } from '../../common/tenant/tenant.module';
import { attachmentUploadOptions } from '../../common/uploads/upload-options';

@Module({
  imports: [
    // Module-wide defaults; each upload route also passes its preset explicitly.
    MulterModule.register(attachmentUploadOptions),
    TenantModule,
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
