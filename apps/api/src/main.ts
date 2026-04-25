import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { RequestLoggingInterceptor } from './common/logger/request-logging.interceptor';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

function validateProductionEnv() {
  const required = [
    'DB_HOST', 'DB_PASSWORD', 'DB_USERNAME', 'DB_DATABASE',
    'AUTH0_DOMAIN', 'AUTH0_AUDIENCE',
    'CORS_ORIGINS',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    validateProductionEnv();
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    ...(isProduction ? { logger: new JsonLoggerService() } : {}),
  });

  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Trust proxy for correct client IP behind reverse proxies (Railway, Caddy, ALB)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Compression
  app.use(compression());

  // Request body size limit
  app.use(json({ limit: '10mb' }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS - require explicit origin configuration in production
  const corsOrigins = configService.get('CORS_ORIGINS', '');
  const nodeEnv = configService.get('NODE_ENV', 'development');
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map((o: string) => o.trim())
      : nodeEnv === 'production'
        ? false
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation (disabled in production)
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nexly API')
      .setDescription('Nexly Maintenance Management API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter Auth0 access token',
        },
        'JWT',
      )
      .addTag('assets', 'Asset management endpoints')
      .addTag('work-orders', 'Work order management endpoints')
      .addTag('pm', 'Preventive maintenance endpoints')
      .addTag('inventory', 'Inventory management endpoints')
      .addTag('reports', 'Reporting and analytics endpoints')
      .addTag('ai', 'AI assistant endpoints')
      .addTag('notifications', 'Notification endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // WebSocket adapter with Redis for scalable real-time
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(configService);
  app.useWebSocketAdapter(redisIoAdapter);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get('PORT', 4000);
  await app.listen(port, '::');

  logger.log(`Nexly API running on port ${port}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
