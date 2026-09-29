import { Module } from '@nestjs/common';
import { ChatSiteController } from '../controllers/chat-site-controller';
import { ChatRepository } from '../repositories/chat-repository';
import { ChatSiteService } from '../services/chat-site-service';

@Module({
  controllers: [ChatSiteController],
  providers: [ChatSiteService, ChatRepository],
  exports: [ChatSiteService],
})
export class ChatSiteModule {}
