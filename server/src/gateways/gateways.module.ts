import { Global, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { NotificationGateway } from './notification.gateway';

/**
 * Every socket.io namespace the server exposes. Global so a feature service or a
 * scheduler processor can push to a signed-in user without importing this module
 * into each of theirs — gateways are infrastructure, not features.
 */
@Global()
@Module({
  providers: [ChatGateway, NotificationGateway],
  exports: [ChatGateway, NotificationGateway],
})
export class GatewaysModule {}
