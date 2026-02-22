import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';

// Auth
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { AssetsModule } from './modules/assets/assets.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { PmModule } from './modules/pm/pm.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { AiModule } from './modules/ai/ai.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'cmms'),
        password: config.get('DB_PASSWORD', 'cmms'),
        database: config.get('DB_DATABASE', 'cmms'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('DB_SYNCHRONIZE', 'false') === 'true',
        logging: config.get('DB_LOGGING', 'false') === 'true',
        ssl: config.get('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // BullMQ for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),

    // Auth
    AuthModule,

    // Feature Modules
    UsersModule,
    AssetsModule,
    WorkOrdersModule,
    PmModule,
    InventoryModule,
    NotificationsModule,
    FilesModule,
    AiModule,
    ReportsModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
