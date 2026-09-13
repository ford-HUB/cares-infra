import { Module } from '@nestjs/common';
import { EventsMobileModule } from './events-mobile-module';
import { EventsSiteModule } from './events-site-module';

@Module({
  // Mobile first: `GET v1/events/recommended` must register before the site
  // controller's `:id`-prefixed routes so the literal segment wins.
  imports: [EventsMobileModule, EventsSiteModule],
})
export class EventsModule {}
