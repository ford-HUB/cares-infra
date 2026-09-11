import { Module } from '@nestjs/common';
import { AnnouncementsSiteModule } from './announcements-site-module';

/**
 * Site-only for now: the board is written on the admin portal. The mobile feed that
 * reads published notices does not exist yet, so there is no mobile half to wire up.
 */
@Module({
  imports: [AnnouncementsSiteModule],
})
export class AnnouncementsModule {}
