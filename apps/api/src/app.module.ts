import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

// Auth
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';

// Filters
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Tenant
import { TenantModule } from './common/tenant/tenant.module';

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
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ActivityModule } from './modules/activity/activity.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ImportsModule } from './modules/imports/imports.module';
import { BlackoutsModule } from './modules/blackouts/blackouts.module';
import { FeatureGateGuard } from './common/guards/feature-gate.guard';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import { HealthController } from './health.controller';

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
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const sslEnabled = config.get('DB_SSL', 'false') === 'true';

        const baseOptions = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          migrationsRun: config.get('DB_RUN_MIGRATIONS', 'true') === 'true',
          synchronize: false,
          logging: config.get('DB_LOGGING', 'false') === 'true',
          extra: {
            max: config.get<number>('DB_POOL_MAX', 20),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          },
        };

        if (databaseUrl) {
          return {
            ...baseOptions,
            url: databaseUrl,
            ssl: databaseUrl.includes('sslmode=require') || sslEnabled
              ? { rejectUnauthorized: false }
              : false,
          };
        }

        return {
          ...baseOptions,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'nexly'),
          password: config.get<string>('DB_PASSWORD', 'nexly'),
          database: config.get<string>('DB_DATABASE', 'nexly'),
          ssl: sslEnabled
            ? { rejectUnauthorized: config.get('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true' }
            : false,
        };
      },
    }),

    // BullMQ for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');

        const connection = redisUrl
          ? { url: redisUrl }
          : {
              host: config.get('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
              password: config.get('REDIS_PASSWORD'),
            };

        return {
          connection,
          defaultJobOptions: {
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
            attempts: 3,
            backoff: { type: 'exponential' as const, delay: 1000 },
          },
        };
      },
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Auth
    AuthModule,

    // Tenant services/controllers
    TenantModule,

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
    RealtimeModule,
    ActivityModule,
    WebhooksModule,
    ImportsModule,
    BlackoutsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureGateGuard,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
