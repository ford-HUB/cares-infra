import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '../infastructures/jwt/jwt-service';
import { isPortalRole } from '../shared/constants/portal-role-types';
import type {
  ChatMessageDto,
  ChatReadReceiptDto,
} from '../modules/chat/dto/chat-site-dto';
import { allowedOrigins } from '../shared/utils/environment-utils';

/** Must match the portal's listeners. */
export const CHAT_MESSAGE_EVENT = 'chat:message';
export const CHAT_READ_EVENT = 'chat:read';
export const CHAT_PRESENCE_EVENT = 'chat:presence';
export const CHAT_PRESENCE_LIST_EVENT = 'chat:presence-list';

/** Per-user room so every open tab receives messages. */
function roomFor(userId: string): string {
  return `user:${userId}`;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private server!: Server;

  /** userId → socket count, so closing one tab doesn't mark offline. */
  private readonly connections = new Map<string, number>();

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

      client.emit(CHAT_PRESENCE_LIST_EVENT, {
        user_ids: [...this.connections.keys()],
      });

      const previous = this.connections.get(payload.sub) ?? 0;
      this.connections.set(payload.sub, previous + 1);
      if (previous === 0) {
        this.broadcastPresence(payload.sub, true);
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.socketUsers.get(client);
    if (!userId) return;
    this.socketUsers.delete(client);

    const remaining = (this.connections.get(userId) ?? 1) - 1;
    if (remaining > 0) {
      this.connections.set(userId, remaining);
      return;
    }

    this.connections.delete(userId);
    this.broadcastPresence(userId, false);
    this.logger.debug(`chat socket disconnected for user ${userId}`);
  }

  private broadcastPresence(userId: string, online: boolean): void {
    this.server?.emit(CHAT_PRESENCE_EVENT, { user_id: userId, online });
  }

  /** `contactId` differs per side, so each participant gets its own emit. */
  emitMessage(
    userId: string,
    contactId: string,
    message: ChatMessageDto,
  ): void {
    this.server
      ?.to(roomFor(userId))
      .emit(CHAT_MESSAGE_EVENT, { contact_id: contactId, message });
  }

  emitRead(userId: string, receipt: ChatReadReceiptDto): void {
    this.server?.to(roomFor(userId)).emit(CHAT_READ_EVENT, receipt);
  }
}
