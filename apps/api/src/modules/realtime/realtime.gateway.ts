import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
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
      const payload = await verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY', ''),
      }) as any;

      // Resolve email from Clerk user
      let email = String(payload.email || '');
      let name = 'Unknown';
      try {
        const clerkUser = await this.clerk.users.getUser(payload.sub);
        email = email ||
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

      // Resolve tenant from org_id or personal tenant
      let tenantId: string | undefined;
      if (payload.org_id) {
        tenantId = await this.usersService.getTenantIdByClerkOrgId(payload.org_id) || undefined;
        if (!tenantId) {
          // Auto-provision for new Clerk org
          try {
            const org = await this.clerk.organizations.getOrganization({ organizationId: payload.org_id });
            const slug = org.slug || org.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `org-${Date.now()}`;
            tenantId = await this.usersService.autoProvisionTenant(org.name || 'My Organization', slug, payload.org_id);
          } catch { /* fall through */ }
        }
      }
      if (!tenantId && email) {
        // Personal tenant fallback
        const slug = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `user-${Date.now()}`;
        tenantId = await this.usersService.autoProvisionPersonalTenant(email, slug);
      }
      if (!tenantId) {
        throw new UnauthorizedException('Cannot resolve tenant');
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
