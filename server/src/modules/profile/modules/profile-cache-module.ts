import { Module } from '@nestjs/common';
import { ProfileCacheService } from '../services/profile-cache-service';

/**
 * Standalone so a write path outside this feature (the account-settings email change)
 * can invalidate the profile cache without importing the profile controller.
 */
@Module({
  providers: [ProfileCacheService],
  exports: [ProfileCacheService],
})
export class ProfileCacheModule {}
