import { Module } from '@nestjs/common';
import { ProfileSiteController } from '../controllers/profile-site-controller';
import { ProfileRepository } from '../repositories/profile-repository';
import { ProfileSiteService } from '../services/profile-site-service';

@Module({
  controllers: [ProfileSiteController],
  providers: [ProfileSiteService, ProfileRepository],
  exports: [ProfileSiteService],
})
export class ProfileSiteModule {}
