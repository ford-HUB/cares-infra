import { Module } from '@nestjs/common';
import { AnnouncementsSiteModule } from './announcements-site-module';

/** Site-only: no mobile feed yet. */
@Module({
  imports: [AnnouncementsSiteModule],
})
export class AnnouncementsModule {}
