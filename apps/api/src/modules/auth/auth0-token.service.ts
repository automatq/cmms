import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwksRsa from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

export interface Auth0JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  org_id?: string;
  org_name?: string;
  [key: string]: unknown;
}

@Injectable()
export class Auth0TokenService {
  private readonly jwksClient: jwksRsa.JwksClient;
  private readonly audience: string;
  private readonly issuer: string;
  private readonly logger = new Logger(Auth0TokenService.name);

  constructor(private readonly configService: ConfigService) {
    const domain = this.configService.get<string>('AUTH0_DOMAIN', '');
    this.audience = this.configService.get<string>('AUTH0_AUDIENCE', '');
    this.issuer = `https://${domain}/`;

    this.jwksClient = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri: `https://${domain}/.well-known/jwks.json`,
    });
  }

  async verifyAccessToken(token: string): Promise<Auth0JwtPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new Error('Invalid token format');
    }

    const key = await this.jwksClient.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    const payload = jwt.verify(token, signingKey, {
      audience: this.audience,
      issuer: this.issuer,
      algorithms: ['RS256'],
    }) as Auth0JwtPayload;

    return payload;
  }
}
