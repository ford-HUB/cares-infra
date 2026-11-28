import { Module } from '@nestjs/common';
import { ProfileCacheService } from '../services/profile-cache-service';

/** Standalone so the account-settings email change can invalidate without the profile controller. */
@Module({
  providers: [ProfileCacheService],
  exports: [ProfileCacheService],
})
export class ProfileCacheModule {}
