import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { UsersService } from '../../users/users.service';
import { RequestUser } from '../../../common/interfaces/request-user.interface';

export interface Auth0JwtPayload {
  sub: string; // Auth0 user ID (e.g., "auth0|abc123")
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  picture?: string;
  org_id?: string; // Auth0 Organization ID
  permissions?: string[]; // Direct permissions from Auth0
  exp: number;
  iat: number;
  iss: string;
  aud: string | string[];
  azp?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const auth0Domain = configService.get<string>('AUTH0_DOMAIN', '');
    const auth0Audience = configService.get<string>('AUTH0_AUDIENCE', '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `https://${auth0Domain}/`,
      audience: auth0Audience,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: Auth0JwtPayload): Promise<RequestUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    // Resolve tenantId from Auth0 Organization ID
    let tenantId: string | undefined;

    if (payload.org_id) {
      tenantId =
        (await this.usersService.getTenantIdByAuth0OrgId(payload.org_id)) ||
        undefined;
    }

    if (!tenantId) {
      throw new UnauthorizedException(
        'Unable to resolve tenant from token. Ensure the user belongs to an Auth0 Organization.',
      );
    }

    // Sync/create user in the local database
    const email = payload.email || '';
    const name =
      payload.name ||
      [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      payload.nickname ||
      email.split('@')[0] ||
      'Unknown';

    const user = await this.usersService.syncFromAuth0(
      payload.sub,
      email,
      name,
      tenantId,
    );

    return {
      userId: user.id,
      tenantId,
      email: payload.email || user.email,
      permissions: payload.permissions || [],
      roles: user.roles?.map((r) => r.name) || [],
    };
  }
}
