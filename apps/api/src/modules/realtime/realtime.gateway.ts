import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly config: ConfigService) {}

  handleConnection(client: AuthenticatedSocket) {
    const tenantId = this.config.get<string>('DEFAULT_TENANT_ID', '00000000-0000-0000-0000-000000000001');
    const userId = this.config.get<string>('DEFAULT_USER_ID', '00000000-0000-0000-0000-000000000002');

    client.userId = userId;
    client.tenantId = tenantId;

    client.join(`tenant:${tenantId}`);
    client.join(`user:${userId}`);

    this.logger.log(`Client connected: ${userId} (tenant: ${tenantId})`);
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
