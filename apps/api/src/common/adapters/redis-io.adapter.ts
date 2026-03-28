import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private configService: ConfigService;

  constructor(app: INestApplication) {
    super(app);
    this.configService = app.get(ConfigService);
  }

  async connectToRedis(configService: ConfigService): Promise<void> {
    const host = configService.get('REDIS_HOST', 'localhost');
    const port = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get('REDIS_PASSWORD');

    const pubClient = createClient({
      url: `redis://${host}:${port}`,
      password: password || undefined,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): any {
    const corsOrigins = this.configService?.get('CORS_ORIGINS', '');
    const nodeEnv = this.configService?.get('NODE_ENV', 'development');
    const origin = corsOrigins
      ? corsOrigins.split(',').map((o: string) => o.trim())
      : nodeEnv === 'production'
        ? false
        : true;

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
    server.adapter(this.adapterConstructor);
    return server;
  }
}
