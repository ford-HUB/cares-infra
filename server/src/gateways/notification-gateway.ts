import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '../infastructures/jwt/jwt-service';
import type { NotificationDto } from '../modules/notifications/dto/notifications-site-dto';
import { isPortalRole } from '../shared/constants/portal-role-types';
import { allowedOrigins } from '../shared/utils/environment-utils';

/** Must match the portal's listeners. */
export const NOTIFICATION_NEW_EVENT = 'notification:new';
export const NOTIFICATION_UNREAD_EVENT = 'notification:unread';

/** Per-user room so every open tab receives notices. */
function roomFor(userId: string): string {
  return `user:${userId}`;
}

/** Best-effort push; REST stays the source of truth. */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  private server!: Server;

  /** `socket.data` is untyped. */
  private readonly socketUsers = new WeakMap<Socket, string>();

  constructor(private readonly jwtService: JwtService) {}

  /** HTTP guards don't run for websockets: verify the handshake token here. */
  handleConnection(client: Socket): void {
    const raw =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    const token = raw?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      if (!isPortalRole(payload.role_type)) {
        client.disconnect(true);
        return;
      }

      this.socketUsers.set(client, payload.sub);
      void client.join(roomFor(payload.sub));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.socketUsers.get(client);
    if (!userId) return;
    this.socketUsers.delete(client);
    this.logger.debug(`notification socket disconnected for user ${userId}`);
  }

  /** Same shape as the list endpoint. */
  emitNew(userId: string, notification: NotificationDto): void {
    this.server?.to(roomFor(userId)).emit(NOTIFICATION_NEW_EVENT, notification);
  }

  /** Keeps the badge in sync across tabs. */
  emitUnread(userId: string, unread: number): void {
    this.server
      ?.to(roomFor(userId))
      .emit(NOTIFICATION_UNREAD_EVENT, { unread });
  }
}
