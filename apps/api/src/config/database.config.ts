import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const url = process.env.DATABASE_URL;
  return {
    url,
    logging: process.env.NODE_ENV === 'development' ? 'true' : 'false',
    ssl: process.env.DATABASE_SSL || 'false',
  };
});
