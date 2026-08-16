import { Module } from '@nestjs/common';
import { ChatSiteModule } from './chat-site-module';

@Module({
  imports: [ChatSiteModule],
})
export class ChatModule {}
