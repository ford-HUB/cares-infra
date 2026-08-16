import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleType } from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { resolveImageMimeType } from '../../../shared/utils/image-mime';
import {
  PersistPortalProfileDto,
  PortalProfileDto,
  ProfileAssetKind,
  UpdatePortalProfileDto,
} from '../dto/profile-site-dto';
import { ProfileRepository } from '../repositories/profile-repository';
import {
  PORTAL_PROFILE_ALLOWED_IMAGE_MIMES,
  PORTAL_PROFILE_MAX_IMAGE_BYTES,
  PORTAL_PROFILE_MAX_SIGNATURE_BYTES,
} from '../validators/profile-site-validator';

@Injectable()
export class ProfileSiteService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly s3Service: S3Service,
  ) {}

  async getMyProfile(userId: string): Promise<PortalProfileDto> {
    const user = await this.profileRepository.findPortalProfile(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToDto(user);
  }

  async updateMyProfile(
    userId: string,
    data: UpdatePortalProfileDto,
    files?: {
      avatar?: Express.Multer.File;
      signature?: Express.Multer.File;
    },
  ): Promise<PortalProfileDto> {
    const existing = await this.profileRepository.findPortalProfile(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const phoneOwner = await this.profileRepository.findPhoneOwner(
      data.phone_number,
      userId,
    );
    if (phoneOwner) {
      throw new ConflictException('Phone number is already in use');
    }

    const isDirector = existing.role.type === RoleType.DIRECTOR;
    const avatarUrl = files?.avatar
      ? await this.uploadImage(userId, 'avatar', files.avatar)
      : undefined;
    const signatureUrl = files?.signature
      ? await this.uploadImage(userId, 'signature', files.signature)
      : undefined;

    if (isDirector && !existing.signature_url && !signatureUrl) {
      throw new BadRequestException('Director signature image is required');
    }

    if (!existing.avatar && !avatarUrl) {
      throw new BadRequestException('Profile photo is required');
    }

    if (!isDirector && !data.department?.trim()) {
      throw new BadRequestException('Department is required');
    }

    const payload: PersistPortalProfileDto & {
      avatar?: string | null;
      signature_url?: string | null;
    } = {
      ...data,
      department: isDirector ? null : data.department!.trim(),
    };

    if (avatarUrl !== undefined) {
      payload.avatar = avatarUrl;
    }
    if (signatureUrl !== undefined) {
      payload.signature_url = signatureUrl;
    }

    await this.profileRepository.updatePortalProfile(userId, payload);

    const updated = await this.profileRepository.findPortalProfile(userId);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return this.mapToDto(updated);
  }

  async getProfileAsset(userId: string, kind: ProfileAssetKind) {
    const user = await this.profileRepository.findPortalProfile(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storedUrl = kind === 'avatar' ? user.avatar : user.signature_url;
    if (!storedUrl) {
      throw new NotFoundException(
        `${kind === 'avatar' ? 'Profile photo' : 'Signature'} not found`,
      );
    }

    return this.s3Service.getObject(storedUrl);
  }

  private async uploadImage(
    userId: string,
    kind: 'avatar' | 'signature',
    file: Express.Multer.File,
  ): Promise<string> {
    const maxBytes =
      kind === 'signature'
        ? PORTAL_PROFILE_MAX_SIGNATURE_BYTES
        : PORTAL_PROFILE_MAX_IMAGE_BYTES;

    if (file.size > maxBytes) {
      const limitMb = maxBytes / (1024 * 1024);
      throw new BadRequestException(
        `${kind === 'signature' ? 'Signature' : 'Avatar'} must be ${limitMb} MB or smaller`,
      );
    }

    const mime = resolveImageMimeType(file.mimetype, file.originalname);
    if (
      !(PORTAL_PROFILE_ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)
    ) {
      throw new BadRequestException(
        'Only JPG, PNG, or WebP images are allowed',
      );
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `portal-profiles/${userId}/${kind}-${Date.now()}-${safeName}`;

    return this.s3Service.uploadToS3(key, file.buffer, mime);
  }

  private mapToDto(
    user: NonNullable<
      Awaited<ReturnType<ProfileRepository['findPortalProfile']>>
    >,
  ): PortalProfileDto {
    const email = user.accounts[0]?.email ?? '';
    const isDirector = user.role.type === RoleType.DIRECTOR;
    const hasCoreFields = isDirector
      ? Boolean(user.address_city?.trim() && user.phone_number?.trim())
      : Boolean(
          user.portal_department?.trim() &&
          user.address_city?.trim() &&
          user.phone_number?.trim(),
        );
    const profileComplete =
      hasCoreFields && (!isDirector || Boolean(user.signature_url));

    return {
      firstname: user.firstname,
      lastname: user.lastname,
      email,
      has_profile_image: Boolean(user.avatar),
      has_signature: Boolean(user.signature_url),
      department: user.portal_department,
      phone_number: user.phone_number,
      gender: user.gender,
      address: {
        street: user.address_street,
        barangay: user.address_barangay,
        city: user.address_city,
        province: user.address_province,
      },
      role_type: user.role.type,
      profile_complete: profileComplete,
    };
  }
}
