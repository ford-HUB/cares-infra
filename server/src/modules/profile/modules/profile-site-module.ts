import { Module } from '@nestjs/common';
import { ProfileSiteController } from '../controllers/profile-site-controller';
import { ProfileRepository } from '../repositories/profile-repository';
import { ProfileSiteService } from '../services/profile-site-service';
import { ProfileCacheModule } from './profile-cache-module';

@Module({
  imports: [ProfileCacheModule],
  controllers: [ProfileSiteController],
  providers: [ProfileSiteService, ProfileRepository],
  exports: [ProfileSiteService],
})
export class ProfileSiteModule {}
