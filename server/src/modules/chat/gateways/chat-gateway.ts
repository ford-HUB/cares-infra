import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '../../../infastructures/jwt/jwt-service';
import { isPortalRole } from '../../../shared/constants/portal-role-types';
import type { ChatMessageDto, ChatReadReceiptDto } from '../dto/chat-site-dto';

/** Server → client event names; the portal listens for exactly these. */
export const CHAT_MESSAGE_EVENT = 'chat:message';
export const CHAT_READ_EVENT = 'chat:read';
export const CHAT_PRESENCE_EVENT = 'chat:presence';
export const CHAT_PRESENCE_LIST_EVENT = 'chat:presence-list';

function corsOrigins(): string[] {
  return (
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:5173', 'http://127.0.0.1:5173']
  );
}

/** One room per user, so a person's open tabs all receive their messages. */
function roomFor(userId: string): string {
  return `user:${userId}`;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: corsOrigins(), credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private server!: Server;

  /** userId → open socket count, so a second tab doesn't mark someone offline. */
  private readonly connections = new Map<string, number>();

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

      // Hand the newcomer the current roster, then tell everyone else about them.
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

  /**
   * `contactId` is who the message is *with* from the recipient's point of view,
   * which differs per side — so each participant gets their own emit.
   */
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
