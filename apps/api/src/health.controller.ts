import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './modules/auth/decorators/public.decorator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createClient } from 'redis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Redis check
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const clientOptions = redisUrl
        ? { url: redisUrl }
        : {
            url: `redis://${this.configService.get('REDIS_HOST', 'localhost')}:${this.configService.get<number>('REDIS_PORT', 6379)}`,
            password: this.configService.get('REDIS_PASSWORD') || undefined,
          };
      const client = createClient(clientOptions);
      await client.connect();
      await client.ping();
      await client.disconnect();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
