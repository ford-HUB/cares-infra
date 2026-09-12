import { Module } from '@nestjs/common';
import { AuthMobileModule } from '../../auth/modules/auth-mobile-module';
import { ProfileMobileController } from '../controllers/profile-mobile-controller';
import { ProfileRepository } from '../repositories/profile-repository';
import { ProfileMobileService } from '../services/profile-mobile-service';
import { ProfileCacheModule } from './profile-cache-module';
import { ProfileSiteModule } from './profile-site-module';

@Module({
  // Avatar bytes come through the site service's Redis/S3 read-through so both
  // clients share one cached copy.
  // The school-record rewrite reads the registration session the ID / face /
  // OCR steps left in Redis.
  imports: [ProfileSiteModule, ProfileCacheModule, AuthMobileModule],
  controllers: [ProfileMobileController],
  providers: [ProfileMobileService, ProfileRepository],
  exports: [ProfileMobileService],
})
export class ProfileMobileModule {}
