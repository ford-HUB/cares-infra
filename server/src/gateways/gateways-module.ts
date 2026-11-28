import { Global, Module } from '@nestjs/common';
import { ChatGateway } from './chat-gateway';
import { NotificationGateway } from './notification-gateway';
import { ResidentialNeedsGateway } from './residential-needs-gateway';

/** Global so services and schedulers can push without importing it. */
@Global()
@Module({
  providers: [ChatGateway, NotificationGateway, ResidentialNeedsGateway],
  exports: [ChatGateway, NotificationGateway, ResidentialNeedsGateway],
})
export class GatewaysModule {}
