import { initSentry } from './common/sentry/sentry.init';
initSentry();

import { createServer } from 'http';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

// The worker runs as a headless application context (no Nest HTTP server), but
// Railway's cmms-worker service is configured with an HTTP healthcheck. Expose
// a tiny liveness endpoint so the platform can confirm the process is up; it
// flips to "ready" only after the Nest context has fully initialised.
function startHealthServer(isReady: () => boolean): void {
  const logger = new Logger('WorkerHealth');
  const port = Number(process.env.PORT) || 4000;
  const server = createServer((req, res) => {
    if (req.url && req.url.startsWith('/api/v1/health')) {
      const ready = isReady();
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: ready ? 'ok' : 'starting', role: 'worker' }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'not_found' }));
  });
  server.listen(port, '::', () => logger.log(`Worker health server on port ${port}`));
}

async function bootstrap() {
  const logger = new Logger('Worker');
  let ready = false;
  startHealthServer(() => ready);

  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  await app.init();
  ready = true;
  logger.log('Worker started successfully');
}
bootstrap();
