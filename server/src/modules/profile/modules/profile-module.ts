import { Module } from '@nestjs/common';
import { ProfileSiteModule } from './profile-site-module';

@Module({
    imports: [ProfileSiteModule],
})
export class ProfileModule {}
