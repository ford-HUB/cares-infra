import { Module } from '@nestjs/common';
import { AuthMobileModule } from '../../auth/modules/auth-mobile-module';
import { ProfileMobileController } from '../controllers/profile-mobile-controller';
import { ProfileRepository } from '../repositories/profile-repository';
import { ProfileMobileService } from '../services/profile-mobile-service';
import { ProfileCacheModule } from './profile-cache-module';
import { ProfileSiteModule } from './profile-site-module';
import { RankingsCoreModule } from '../../rankings/modules/rankings-core-module';

@Module({
  // Site service: shared Redis/S3 avatar read-through.
  // Registration session: ID/face/OCR results for the school-record rewrite.
  imports: [
    ProfileSiteModule,
    ProfileCacheModule,
    AuthMobileModule,
    RankingsCoreModule,
  ],
  controllers: [ProfileMobileController],
  providers: [ProfileMobileService, ProfileRepository],
  exports: [ProfileMobileService],
})
export class ProfileMobileModule {}
