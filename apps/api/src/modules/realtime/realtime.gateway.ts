import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../users/users.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly auth0Domain: string;
  private readonly auth0Audience: string;
  private getSigningKey: (kid: string) => Promise<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.auth0Domain = this.configService.get<string>('AUTH0_DOMAIN', '');
    this.auth0Audience = this.configService.get<string>('AUTH0_AUDIENCE', '');

    // Build a JWKS key getter (same as JwtStrategy)
    const jwksClient = require('jwks-rsa')({
      jwksUri: `https://${this.auth0Domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });

    this.getSigningKey = (kid: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        jwksClient.getSigningKey(kid, (err: any, key: any) => {
          if (err) return reject(err);
          resolve(key.getPublicKey());
        });
      });
    };
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Decode header to get kid
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header?.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Get signing key and verify
      const signingKey = await this.getSigningKey(decoded.header.kid);
      const payload: any = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: `https://${this.auth0Domain}/`,
        audience: this.auth0Audience,
      });

      // Resolve tenant
      const tenantId = await this.usersService.getTenantIdByAuth0OrgId(
        payload.org_id,
      );
      if (!tenantId) {
        throw new UnauthorizedException('Cannot resolve tenant');
      }

      // Sync user
      const email = payload.email || '';
      const name =
        payload.name ||
        [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
        payload.nickname ||
        'Unknown';

      const user = await this.usersService.syncFromAuth0(
        payload.sub,
        email,
        name,
        tenantId,
      );

      // Attach identity to socket
      client.userId = user.id;
      client.tenantId = tenantId;

      // Join rooms
      client.join(`tenant:${tenantId}`);
      client.join(`user:${user.id}`);

      this.logger.log(`Client connected: ${user.id} (tenant: ${tenantId})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error instanceof Error ? error.message : error}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  /** Emit to all users in a tenant */
  emitToTenant(tenantId: string, event: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }

  /** Emit to a specific user */
  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
