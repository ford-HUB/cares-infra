import { Module } from '@nestjs/common';
import { ProfileMobileModule } from './profile-mobile-module';
import { ProfileSiteModule } from './profile-site-module';

@Module({
  imports: [ProfileMobileModule, ProfileSiteModule],
})
export class ProfileModule {}
