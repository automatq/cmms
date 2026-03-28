import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
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
  private readonly clerk;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.configService.get<string>('CLERK_SECRET_KEY', ''),
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify token with Clerk
      const payload = await this.clerk.verifyToken(token);

      if (!payload.org_id) {
        throw new UnauthorizedException('No organization in token');
      }

      // Resolve tenant
      const tenantId = await this.usersService.getTenantIdByClerkOrgId(
        payload.org_id,
      );
      if (!tenantId) {
        throw new UnauthorizedException('Cannot resolve tenant');
      }

      // Resolve email from Clerk user
      let email = '';
      let name = 'Unknown';
      try {
        const clerkUser = await this.clerk.users.getUser(payload.sub);
        email =
          clerkUser.emailAddresses?.find(
            (e) => e.id === clerkUser.primaryEmailAddressId,
          )?.emailAddress || '';
        name =
          [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(' ') || email.split('@')[0] || 'Unknown';
      } catch {
        // Fall through with defaults
      }

      // Sync user
      const user = await this.usersService.syncFromClerk(
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
