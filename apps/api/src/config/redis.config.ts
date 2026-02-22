import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    url: redisUrl,
  };
});
