import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '../infastructures/jwt/jwt-service';
import { isPortalRole } from '../shared/constants/portal-role-types';

/** Server → client event name; the Residential Needs screens listen for it. */
export const RESIDENTIAL_NEEDS_CHANGED_EVENT = 'residential-needs:changed';

function corsOrigins(): string[] {
  return (
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:5173', 'http://127.0.0.1:5173']
  );
}

/**
 * Tells open Residential Needs screens that a beneficiary submitted or updated
 * a survey, so the list and the clustering reload without a refresh. The event
 * carries no rows — the REST endpoints stay the source of truth.
 */
@WebSocketGateway({
  namespace: '/residential-needs',
  cors: { origin: corsOrigins(), credentials: true },
})
export class ResidentialNeedsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  /** The HTTP guards never run for websockets; only portal accounts may listen. */
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
      if (!isPortalRole(payload.role_type)) client.disconnect(true);
    } catch {
      client.disconnect(true);
    }
  }

  emitChanged(): void {
    this.server?.emit(RESIDENTIAL_NEEDS_CHANGED_EVENT, {
      at: new Date().toISOString(),
    });
  }
}
