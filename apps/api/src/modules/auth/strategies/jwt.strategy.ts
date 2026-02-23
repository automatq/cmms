import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  exp: number;
  iat: number;
  iss: string;
  aud: string | string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    const keycloakInternalUrl = configService.get('KEYCLOAK_URL', 'http://keycloak:8080');
    const keycloakRealm = configService.get('KEYCLOAK_REALM', 'cmms');
    // Internal URL for fetching JWKS keys (container-to-container)
    const internalIssuerUrl = `${keycloakInternalUrl}/realms/${keycloakRealm}`;
    // Public URL is what appears in the token's "iss" claim (browser-facing)
    const publicUrl = configService.get('KEYCLOAK_PUBLIC_URL', keycloakInternalUrl);
    const publicIssuerUrl = `${publicUrl}/realms/${keycloakRealm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Match the issuer the browser sees (PUBLIC_URL/auth)
      issuer: publicIssuerUrl,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        // Fetch certs from internal container URL
        jwksUri: `${internalIssuerUrl}/protocol/openid-connect/certs`,
      }),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }
    return payload;
  }
}
