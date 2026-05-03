import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { RequestLoggingInterceptor } from './common/logger/request-logging.interceptor';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

function validateProductionEnv() {
  const required = [
    'DB_HOST', 'DB_PASSWORD', 'DB_USERNAME', 'DB_DATABASE',
    'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL',
    'PUBLIC_WEB_URL',
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
    bodyParser: false, // Better Auth needs the raw body; we re-add JSON parsing below for /api/v1/*
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

  // Re-enable body parsing for non-Better Auth routes
  // (bodyParser:false above disabled it so Better Auth can read raw bodies)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/auth')) return next();
    json({ limit: '10mb' })(req, res, (err) => {
      if (err) return next(err);
      urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
  });

  // Global prefix (Better Auth handler is mounted at /api/auth/* by its module — bypasses prefix)
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
          description: 'Enter JWT access token',
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
