import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { auth } from '../auth/better-auth';

interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
}

@WebSocketGateway({
  transports: ['websocket', 'polling'],
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  async handleConnection(client: AuthenticatedSocket) {
    // Read bearer token from socket.io auth payload (clients pass it as auth.token)
    // or fall back to the Authorization header for compatibility.
    const token: string | undefined =
      client.handshake.auth?.token ||
      (client.handshake.headers?.authorization?.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : undefined);

    if (!token) {
      this.logger.warn(`Socket connect rejected (no token): ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const headers = new Headers();
      headers.set('Authorization', `Bearer ${token}`);
      const session = await auth.api.getSession({ headers });

      if (!session?.session || !session?.user) {
        this.logger.warn(`Socket connect rejected (invalid session): ${client.id}`);
        client.disconnect(true);
        return;
      }

      const userId = session.user.id;
      const tenantId = (session.session as any).activeOrganizationId;

      if (!tenantId) {
        this.logger.warn(`Socket connect rejected (no active org): user=${userId}`);
        client.disconnect(true);
        return;
      }

      client.userId = userId;
      client.tenantId = tenantId;
      client.join(`tenant:${tenantId}`);
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${userId} (tenant: ${tenantId})`);
    } catch (err) {
      this.logger.warn(
        `Socket connect rejected (auth error): ${err instanceof Error ? err.message : err}`,
      );
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
