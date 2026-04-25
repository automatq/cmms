import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Auth0TokenService } from '../auth/auth0-token.service';
import { UsersService } from '../users/users.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
}

@WebSocketGateway({
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly auth0TokenService: Auth0TokenService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.auth0TokenService.verifyAccessToken(token);

      const email = String(payload.email || '');
      const name = String(payload.name || '') || email.split('@')[0] || 'Unknown';

      let tenantId: string | undefined;
      if (payload.org_id) {
        tenantId = await this.usersService.getTenantIdByAuth0OrgId(payload.org_id) || undefined;
        if (!tenantId) {
          try {
            const orgName = String(payload.org_name || '') || `Organization ${payload.org_id}`;
            const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `org-${Date.now()}`;
            tenantId = await this.usersService.autoProvisionTenant(orgName, slug, payload.org_id);
          } catch { /* fall through */ }
        }
      }
      if (!tenantId && email) {
        const slug = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `user-${Date.now()}`;
        tenantId = await this.usersService.autoProvisionPersonalTenant(email, slug);
      }
      if (!tenantId) {
        throw new UnauthorizedException('Cannot resolve tenant');
      }

      const user = await this.usersService.syncFromAuth(
        payload.sub,
        email,
        name,
        tenantId,
      );

      client.userId = user.id;
      client.tenantId = tenantId;

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
