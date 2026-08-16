import { Module } from '@nestjs/common';
import { ChatSiteController } from '../controllers/chat-site-controller';
import { ChatGateway } from '../gateways/chat-gateway';
import { ChatRepository } from '../repositories/chat-repository';
import { ChatSiteService } from '../services/chat-site-service';

@Module({
  controllers: [ChatSiteController],
  providers: [ChatSiteService, ChatRepository, ChatGateway],
  exports: [ChatSiteService],
})
export class ChatSiteModule {}
