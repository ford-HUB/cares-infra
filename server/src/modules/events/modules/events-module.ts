import { Module } from '@nestjs/common';
import { EventsSiteModule } from './events-site-module';

@Module({
  imports: [EventsSiteModule],
})
export class EventsModule {}
