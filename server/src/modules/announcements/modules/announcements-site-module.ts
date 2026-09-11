import { Module } from '@nestjs/common';
import { AnnouncementsSiteController } from '../controllers/announcements-site-controller';
import { AnnouncementsRepository } from '../repositories/announcements-repository';
import { AnnouncementsSiteService } from '../services/announcements-site-service';

@Module({
  controllers: [AnnouncementsSiteController],
  providers: [AnnouncementsSiteService, AnnouncementsRepository],
  exports: [AnnouncementsSiteService, AnnouncementsRepository],
})
export class AnnouncementsSiteModule {}
