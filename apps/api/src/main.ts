// Sentry must be initialized before NestFactory so its instrumentation
// can wrap the HTTP server and outgoing requests.
import { initSentry } from './common/sentry/sentry.init';
initSentry();

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
import { SentryExceptionFilter } from './common/sentry/sentry.filter';
import { auth } from './modules/auth/better-auth';

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
  app.useGlobalFilters(new SentryExceptionFilter());

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Trust proxy for correct client IP behind reverse proxies (Railway, Caddy, ALB)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Compression
  app.use(compression());

  // Build trusted CORS origins list (used by both Better Auth handler below
  // and NestJS CORS middleware further down).
  const corsOriginsList = (configService.get('CORS_ORIGINS', '') || '')
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean);

  // Resolve the Access-Control-Allow-Origin value for one request, shared
  // by the inline Better Auth handler and the NestJS CORS middleware below.
  // Never falls back to '*' in production — if the request origin isn't in
  // the trusted list and the list is non-empty, we send the first trusted
  // origin (browsers will block the request because the credential check
  // fails, but we never advertise a wildcard).
  function resolveAllowOrigin(requestOrigin: string | undefined): string {
    if (corsOriginsList.length === 0) {
      // Dev convenience only: no list configured → echo origin or '*'.
      // Production path doesn't take this branch because we require
      // CORS_ORIGINS via validateProductionEnv().
      return requestOrigin || '*';
    }
    if (requestOrigin && corsOriginsList.includes(requestOrigin)) {
      return requestOrigin;
    }
    return corsOriginsList[0];
  }

  // Mount Better Auth handler at /api/auth/* BEFORE body parsers and global prefix.
  // Better Auth needs raw bodies; everything else (api/v1/*) gets JSON parsing.
  // We can't use nestjs-better-auth's auto-mounting because it uses Express-5 *splat
  // syntax that doesn't match in Express 4 (which Nest 10's platform-express ships).
  // We also handle CORS inline here because NestJS's app.enableCors() runs after
  // these routes are matched (the Express router matches by registration order).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all('/api/auth/*', async (req: any, res: any) => {
    const requestOrigin = req.headers.origin as string | undefined;
    const allowedOrigin = resolveAllowOrigin(requestOrigin);

    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Cookie',
    );
    res.setHeader('Access-Control-Expose-Headers', 'set-auth-token, set-auth-jwt');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    try {
      const url = new URL(req.url, `${req.protocol}://${req.get('host')}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
        else if (value !== undefined) headers.append(key, String(value));
      }
      const init: RequestInit = { method: req.method, headers };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => resolve());
          req.on('error', reject);
        });
        if (chunks.length > 0) init.body = Buffer.concat(chunks);
      }
      const response = await auth.handler(new Request(url.toString(), init));
      res.status(response.status);
      response.headers.forEach((value, key) => {
        // Don't let Better Auth's responses overwrite our CORS headers
        if (!key.toLowerCase().startsWith('access-control-')) {
          res.setHeader(key, value);
        }
      });
      const body = response.body ? await response.text() : null;
      res.send(body);
    } catch (err) {
      console.error('Better Auth handler error:', err);
      res.status(500).json({ error: 'Internal authentication error' });
    }
  });

  // Re-enable body parsing for non-Better Auth routes
  // (bodyParser:false on NestFactory.create disabled it so Better Auth can read raw bodies)
  expressApp.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/auth')) return next();
    json({ limit: '10mb' })(req, res, (err) => {
      if (err) return next(err);
      urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
  });

  // Global prefix (Better Auth's /api/auth/* is already mounted above and bypasses this)
  app.setGlobalPrefix('api/v1');

  // CORS — require explicit origin configuration in production.
  // (`isProduction` and `corsOriginsList` defined above; shared with the
  // Better Auth handler so both code paths agree on what's allowed.)
  const nodeEnv = configService.get('NODE_ENV', 'development');
  app.enableCors({
    origin: corsOriginsList.length > 0
      ? corsOriginsList
      : nodeEnv === 'production'
        ? false
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-auth-token', 'set-auth-jwt'],
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
      .setTitle('MainTek API')
      .setDescription('MainTek Maintenance Management API')
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

  logger.log(`MainTek API running on port ${port}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
