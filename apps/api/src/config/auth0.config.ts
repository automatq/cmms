import { registerAs } from '@nestjs/config';

export default registerAs('auth0', () => ({
  domain: process.env.AUTH0_DOMAIN || '',
  audience: process.env.AUTH0_AUDIENCE || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  managementApiAudience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
}));
