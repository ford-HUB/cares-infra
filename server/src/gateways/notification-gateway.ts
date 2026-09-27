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

/** Server → client event names; the portal listens for exactly these. */
export const NOTIFICATION_NEW_EVENT = 'notification:new';
export const NOTIFICATION_UNREAD_EVENT = 'notification:unread';

function corsOrigins(): string[] {
  return (
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:5173', 'http://127.0.0.1:5173']
  );
}

/** One room per user, so a person's open tabs all get the same notice. */
function roomFor(userId: string): string {
  return `user:${userId}`;
}

/**
 * Pushes notifications to signed-in portal users the moment they are written. The
 * REST endpoints remain the source of truth — this only saves the tab a poll, so a
 * client that missed an event (reconnect, closed laptop) reloads the list and is
 * whole again.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: corsOrigins(), credentials: true },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  private server!: Server;

  /** `socket.data` is untyped, so the verified identity is kept here instead. */
  private readonly socketUsers = new WeakMap<Socket, string>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * The HTTP guards never run for websockets, so the handshake token is verified
   * here — an unauthenticated or non-portal socket is dropped immediately.
   */
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

  /** A freshly written row, in the same shape the list endpoint returns. */
  emitNew(userId: string, notification: NotificationDto): void {
    this.server?.to(roomFor(userId)).emit(NOTIFICATION_NEW_EVENT, notification);
  }

  /** The badge count after a read/dismiss from another tab, so every tab agrees. */
  emitUnread(userId: string, unread: number): void {
    this.server
      ?.to(roomFor(userId))
      .emit(NOTIFICATION_UNREAD_EVENT, { unread });
  }
}
