import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../../../infastructures/redis/redis-service';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import type { ProfileAssetKind } from '../dto/profile-site-dto';
import type { PortalProfileRow } from '../repositories/profile-repository';

/**
 * Above this, the asset streams straight from S3 every time. Redis is a cache, not a
 * file store, and a 5 MB avatar base64s to ~6.7 MB of resident memory per user.
 */
const MAX_CACHED_ASSET_BYTES = 1024 * 1024;

export interface CachedProfileAsset {
  buffer: Buffer;
  contentType: string;
  /** Content hash, quoted for the `ETag` header, so a new upload invalidates browsers too. */
  etag: string;
}

/** What actually lands in Redis — JSON only, so the buffer travels as base64. */
interface StoredProfileAsset {
  content_type: string;
  etag: string;
  data: string;
}

/**
 * Cache for the portal shell's per-refresh reads: `GET /v1/profile/me` and the navbar
 * avatar behind `GET /v1/profile/me/{avatar,signature}`. Both are per-user, so every
 * key carries the user id.
 *
 * Every method swallows Redis failures — a cache miss and a dead Redis must look the
 * same to the caller, which then falls through to Prisma/S3.
 */
@Injectable()
export class ProfileCacheService {
  private readonly logger = new Logger(ProfileCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async getProfile(userId: string): Promise<PortalProfileRow | null> {
    return this.safeGet<PortalProfileRow>(this.profileKey(userId));
  }

  async setProfile(userId: string, row: PortalProfileRow): Promise<void> {
    await this.safeSet(
      this.profileKey(userId),
      row,
      DurationUtils.FIVE_MINUTES,
    );
  }

  async getAsset(
    userId: string,
    kind: ProfileAssetKind,
  ): Promise<CachedProfileAsset | null> {
    const stored = await this.safeGet<StoredProfileAsset>(
      this.assetKey(userId, kind),
    );
    if (!stored) {
      return null;
    }

    return {
      buffer: Buffer.from(stored.data, 'base64'),
      contentType: stored.content_type,
      etag: stored.etag,
    };
  }

  /** Returns the asset with its etag whether or not it was small enough to store. */
  async setAsset(
    userId: string,
    kind: ProfileAssetKind,
    asset: { buffer: Buffer; contentType: string },
  ): Promise<CachedProfileAsset> {
    const cached: CachedProfileAsset = {
      ...asset,
      etag: this.buildEtag(asset.buffer),
    };

    if (asset.buffer.byteLength > MAX_CACHED_ASSET_BYTES) {
      return cached;
    }

    const stored: StoredProfileAsset = {
      content_type: cached.contentType,
      etag: cached.etag,
      data: asset.buffer.toString('base64'),
    };
    await this.safeSet(
      this.assetKey(userId, kind),
      stored,
      DurationUtils.ONE_HOUR,
    );

    return cached;
  }

  /**
   * Call from every write that touches a field of the portal profile row —
   * `ProfileSiteService.updateMyProfile` and the account-settings email change.
   */
  async invalidateProfile(userId: string): Promise<void> {
    await this.safeDelete(this.profileKey(userId));
  }

  /** Call when the stored S3 object behind `kind` is replaced. */
  async invalidateAsset(userId: string, kind: ProfileAssetKind): Promise<void> {
    await this.safeDelete(this.assetKey(userId, kind));
  }

  private buildEtag(buffer: Buffer): string {
    return `"${createHash('sha1').update(buffer).digest('hex')}"`;
  }

  private profileKey(userId: string): string {
    return `cache:profile:portal:${userId}`;
  }

  private assetKey(userId: string, kind: ProfileAssetKind): string {
    return `cache:profile:asset:${kind}:${userId}`;
  }

  private async safeGet<T>(key: string): Promise<T | null> {
    try {
      return await this.redisService.get<T>(key);
    } catch (error) {
      this.logger.warn(`Redis read failed for ${key}`, error);
      return null;
    }
  }

  private async safeSet(
    key: string,
    value: unknown,
    ttl: number,
  ): Promise<void> {
    try {
      await this.redisService.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(`Redis write failed for ${key}`, error);
    }
  }

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.redisService.delete(key);
    } catch (error) {
      // The TTL is the backstop, but a missed delete serves stale data until it fires.
      this.logger.error(`Redis invalidation failed for ${key}`, error);
    }
  }
}
