import { Module } from '@nestjs/common';
import { EventsMobileModule } from './events-mobile-module';
import { EventsSiteModule } from './events-site-module';

@Module({
  // Mobile first so `recommended` wins over the site's `:id` routes.
  imports: [EventsMobileModule, EventsSiteModule],
})
export class EventsModule {}
