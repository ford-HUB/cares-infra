import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterestCode,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import {
  OcrServiceClient,
  OcrUnreadableError,
} from '../../../infastructures/microservices/ocr-service-client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { resolveImageMimeType } from '../../../shared/utils/image-mime';
import { AuthMobileService } from '../../auth/services/auth-mobile-service';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  BeneficiaryProfileSectionDto,
  DonorProfileSectionDto,
  MobileProfileDto,
  ProfileCompletionDto,
  ResidencyDocumentDto,
  UpdateMobileProfileDto,
  VolunteerProfileSectionDto,
} from '../dto/profile-mobile-dto';
import type { ProfileAssetKind } from '../dto/profile-site-dto';
import {
  ProfileRepository,
  type MobileProfileRow,
} from '../repositories/profile-repository';
import {
  MOBILE_PROFILE_ALLOWED_AVATAR_MIMES,
  MOBILE_PROFILE_ALLOWED_RESIDENCY_MIMES,
  MOBILE_PROFILE_MAX_AVATAR_BYTES,
  MOBILE_PROFILE_MAX_RESIDENCY_BYTES,
  MOBILE_PROFILE_ROLE_TYPES,
} from '../validators/profile-mobile-validator';
import {
  ProfileCacheService,
  type CachedProfileAsset,
} from './profile-cache-service';

type MobileRoleType = (typeof MOBILE_PROFILE_ROLE_TYPES)[number];

function isMobileRole(role: RoleType): role is MobileRoleType {
  return (MOBILE_PROFILE_ROLE_TYPES as readonly RoleType[]).includes(role);
}

@Injectable()
export class ProfileMobileService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly s3Service: S3Service,
    private readonly profileCacheService: ProfileCacheService,
    private readonly authMobileService: AuthMobileService,
    private readonly ocrServiceClient: OcrServiceClient,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  /**
   * The signed-in person's profile with only the section that matches the
   * role being shown filled in — a donor's payload carries `donor` and null
   * `volunteer` / `beneficiary`, so the app never has to guess which fields
   * apply.
   *
   * [viewRole] is the side the app has open. The role switcher is local to
   * the app, so a volunteer-registered account can be on its beneficiary
   * dashboard; completion and the section are then measured against the
   * beneficiary's requirements, not the volunteer's. Defaults to the
   * registered role.
   */
  async getMyProfile(
    userId: string,
    viewRole?: MobileRoleType,
  ): Promise<MobileProfileDto> {
    const row = await this.profileRepository.findMobileProfile(userId);
    if (!row) {
      throw new NotFoundException('User not found');
    }

    const roleType = row.role.type;
    if (!isMobileRole(roleType)) {
      throw new ForbiddenException('Profile is not available for this role');
    }
    const profilingRole = viewRole ?? roleType;

    const volunteer =
      profilingRole === RoleType.VOLUNTEER
        ? await this.buildVolunteer(row)
        : null;
    const donor =
      profilingRole === RoleType.DONOR ? this.buildDonor(row) : null;
    const beneficiary =
      profilingRole === RoleType.BENEFICIARY ? this.buildBeneficiary() : null;

    const account = row.accounts[0];

    return {
      user_id: row.user_id,
      role_type: roleType,
      profiling_role: profilingRole,
      firstname: row.firstname,
      middle_name: row.middle_name,
      lastname: row.lastname,
      email: account?.email ?? '',
      phone_number: row.phone_number,
      gender: row.gender,
      age: row.age,
      address: {
        street: row.address_street,
        barangay: row.address_barangay,
        city: row.address_city,
        province: row.address_province,
        full: row.current_address,
      },
      household_size: row.household_size,
      residency_documents: row.residency_documents.map((doc) =>
        this.buildResidencyDocument(doc),
      ),
      has_profile_image: Boolean(this.roleAvatarUrl(row, profilingRole)),
      sign_in_providers: row.oauth_identities.map((i) => i.provider),
      has_password: Boolean(account?.password),
      member_since: row.createdAt.toISOString(),
      profile_completion: this.buildCompletion(row, profilingRole),
      volunteer,
      donor,
      beneficiary,
    };
  }

  /**
   * Writes the editable fields and, when one is attached, a new avatar. Returns
   * the re-read profile so the app replaces its copy with the server's, the
   * same way the portal's edit does.
   */
  async updateMyProfile(
    userId: string,
    data: UpdateMobileProfileDto,
    avatar?: Express.Multer.File,
    viewRole?: MobileRoleType,
    audit?: MobileAuditContext,
  ): Promise<MobileProfileDto> {
    const existing = await this.profileRepository.findMobileProfile(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (!isMobileRole(existing.role.type)) {
      throw new ForbiddenException('Profile is not available for this role');
    }

    const phoneOwner = await this.profileRepository.findPhoneOwner(
      data.phone_number,
      userId,
    );
    if (phoneOwner) {
      throw new ConflictException('Phone number is already in use');
    }

    // The photo belongs to the side being edited, never to the whole
    // account: a donor picture must not show up on the volunteer dashboard.
    // The registered role also mirrors onto `User.avatar` so the portal
    // (staff views, chat) keeps seeing the primary picture.
    const registeredRole = existing.role.type;
    const avatarRole = viewRole ?? registeredRole;
    const avatarUrl = avatar
      ? await this.uploadAvatar(userId, avatarRole, avatar)
      : undefined;
    const mirrorToUser =
      avatarUrl !== undefined && avatarRole === registeredRole;

    await this.profileRepository.updateMobileProfile(userId, {
      ...data,
      ...(mirrorToUser ? { avatar: avatarUrl } : {}),
    });
    if (avatarUrl !== undefined) {
      await this.profileRepository.upsertRoleAvatar(
        userId,
        avatarRole,
        avatarUrl,
      );
    }

    // The avatar stream reads through the portal-row cache, so both the row
    // and the bytes go stale the moment the write lands.
    await this.profileCacheService.invalidateProfile(userId);
    if (avatarUrl !== undefined) {
      await this.profileCacheService.invalidateAsset(
        userId,
        this.roleAvatarKind(avatarRole),
      );
      if (mirrorToUser) {
        await this.profileCacheService.invalidateAsset(userId, 'avatar');
      }
    }

    if (audit) {
      const changed = diffProfileFields(existing, data);
      await this.auditLogRecorder.record({
        action:
          avatarUrl !== undefined ? 'profile.photo.updated' : 'profile.updated',
        description:
          avatarUrl !== undefined && changed.length === 0
            ? 'Profile photo updated'
            : `Profile updated: ${[...changed, ...(avatarUrl !== undefined ? ['photo'] : [])].join(', ') || 'no field changes'}`,
        category: 'USER_MANAGEMENT',
        actor: audit.actor,
        targetType: 'user',
        targetLabel: audit.actor.email,
        targetId: userId,
        ipAddress: audit.context.ipAddress,
        userAgent: audit.context.userAgent,
        source: 'MOBILE',
        metadata: { role: avatarRole },
      });
    }

    return this.getMyProfile(userId, viewRole);
  }

  /**
   * The photo for one side of the account, for `GET me/mobile/avatar?role=`.
   * Falls back to `User.avatar` for the registered role so accounts that
   * uploaded before per-role photos existed keep their picture.
   */
  async getRoleAvatar(
    userId: string,
    viewRole?: MobileRoleType,
  ): Promise<CachedProfileAsset> {
    const row = await this.profileRepository.findMobileProfile(userId);
    if (!row) {
      throw new NotFoundException('User not found');
    }
    if (!isMobileRole(row.role.type)) {
      throw new ForbiddenException('Profile is not available for this role');
    }
    const role = viewRole ?? row.role.type;
    const kind = this.roleAvatarKind(role);

    const cached = await this.profileCacheService.getAsset(userId, kind);
    if (cached) {
      return cached;
    }

    const storedUrl = this.roleAvatarUrl(row, role);
    if (!storedUrl) {
      throw new NotFoundException('Profile photo not found');
    }

    const asset = await this.s3Service.getObject(storedUrl);
    return this.profileCacheService.setAsset(userId, kind, asset);
  }

  /** Per-role photo first; the account-wide `avatar` only covers the registered role. */
  private roleAvatarUrl(
    row: MobileProfileRow,
    role: MobileRoleType,
  ): string | null {
    const own = row.role_avatars.find((a) => a.role_type === role)?.avatar_url;
    if (own) {
      return own;
    }
    return role === row.role.type ? row.avatar : null;
  }

  private roleAvatarKind(role: MobileRoleType): ProfileAssetKind {
    return `avatar:${role}`;
  }

  /**
   * Replaces the volunteer's school record with what OCR read off a freshly
   * uploaded ID. The session is the same one registration uses (`upload-id`
   * → `verify-face` → `extract-id`), so the ID has already been validated as a
   * UCLM card and matched against the caller's face before anything here
   * runs. Department, program and year level are taken verbatim from the OCR
   * result — there is no manual input by design.
   */
  async applySchoolRecordFromSession(
    userId: string,
    registrationId: string,
    audit?: MobileAuditContext,
  ): Promise<MobileProfileDto> {
    const existing = await this.profileRepository.findMobileProfile(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (existing.role.type !== RoleType.VOLUNTEER) {
      throw new ForbiddenException('Only volunteers carry a school record');
    }

    const session =
      await this.authMobileService.getRegistrationSession(registrationId);
    if (!session) {
      throw new NotFoundException('Verification session not found or expired');
    }
    if (session.step !== 'ocr_completed' || !session.faceMatch) {
      throw new BadRequestException(
        'Upload your ID and verify your face before updating the school record',
      );
    }

    const ocr = session.ocrData;
    const department = ocr?.departmentName?.trim() ?? '';
    const idNumber = ocr?.idNumber?.trim() ?? '';
    if (!ocr || !department || !idNumber) {
      throw new BadRequestException(
        'We could not read the department off your ID. Retake the photos in good light and try again.',
      );
    }

    const idOwner = await this.profileRepository.findIdNumberOwner(
      idNumber,
      userId,
    );
    if (idOwner) {
      throw new ConflictException(
        'This student ID is already registered to another account',
      );
    }

    await this.profileRepository.replaceSchoolRecord(userId, {
      id_number: idNumber,
      department,
      major: ocr.majorName?.trim() || department,
      year_level: ocr.yearLevelName?.trim() || 'N/A',
      graduation_year: ocr.graduationYear,
      graduation_month: ocr.graduationMonth,
      graduation_day: ocr.graduationDay,
    });

    if (audit) {
      await this.auditLogRecorder.record({
        action: 'profile.school-record.updated',
        description: 'School record re-read from a new ID scan',
        category: 'VERIFICATION',
        actor: audit.actor,
        targetType: 'user',
        targetLabel: audit.actor.email,
        targetId: userId,
        ipAddress: audit.context.ipAddress,
        userAgent: audit.context.userAgent,
        source: 'MOBILE',
      });
    }

    return this.getMyProfile(userId);
  }

  /**
   * Changes the address from a proof-of-residency file instead of typed text.
   * The OCR service reads the address off the document; if it can't, nothing
   * is stored and the person is told to retake it. On success the file is
   * kept on S3 and listed under the profile's `residency_documents`.
   */
  async applyResidencyDocument(
    userId: string,
    file: Express.Multer.File,
    viewRole?: MobileRoleType,
    audit?: MobileAuditContext,
  ): Promise<MobileProfileDto> {
    const existing = await this.profileRepository.findMobileProfile(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (!isMobileRole(existing.role.type)) {
      throw new ForbiddenException('Profile is not available for this role');
    }

    if (file.size > MOBILE_PROFILE_MAX_RESIDENCY_BYTES) {
      const limitMb = MOBILE_PROFILE_MAX_RESIDENCY_BYTES / (1024 * 1024);
      throw new BadRequestException(
        `Residency document must be ${limitMb} MB or smaller`,
      );
    }

    const mime = this.resolveResidencyMime(file);
    if (
      !(MOBILE_PROFILE_ALLOWED_RESIDENCY_MIMES as readonly string[]).includes(
        mime,
      )
    ) {
      throw new BadRequestException(
        'Only JPG, PNG, WebP images or PDF files are allowed',
      );
    }

    let extracted: { address: string };
    try {
      extracted = await this.ocrServiceClient.extractResidencyAddress(
        file.buffer,
        file.originalname,
        mime,
      );
    } catch (error) {
      if (error instanceof OcrUnreadableError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const address = extracted.address.trim().slice(0, 300);
    if (!address) {
      throw new BadRequestException(
        'We could not read an address off this document. Please upload a clearer copy.',
      );
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `mobile-profiles/${userId}/residency-${Date.now()}-${safeName}`;
    const fileUrl = await this.s3Service.uploadToS3(key, file.buffer, mime);

    await this.profileRepository.applyResidencyDocument(userId, {
      file_url: fileUrl,
      file_name: file.originalname,
      mime_type: mime,
      size_bytes: file.size,
      extracted_address: address,
    });

    await this.profileCacheService.invalidateProfile(userId);

    if (audit) {
      await this.auditLogRecorder.record({
        action: 'profile.address.updated',
        description: 'Address updated from a residency document',
        category: 'VERIFICATION',
        actor: audit.actor,
        targetType: 'user',
        targetLabel: audit.actor.email,
        targetId: userId,
        ipAddress: audit.context.ipAddress,
        userAgent: audit.context.userAgent,
        source: 'MOBILE',
        metadata: { file_name: file.originalname },
      });
    }

    return this.getMyProfile(userId, viewRole);
  }

  /** The stored file, for the app's private document viewer. */
  async getResidencyDocument(
    userId: string,
    documentId: string,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const doc = await this.profileRepository.findResidencyDocument(
      userId,
      documentId,
    );
    if (!doc) {
      throw new NotFoundException('Residency document not found');
    }
    const object = await this.s3Service.getObject(doc.file_url);
    return {
      buffer: object.buffer,
      contentType: doc.mime_type || object.contentType,
      fileName: doc.file_name,
    };
  }

  /** PDFs arrive with their own type; anything else goes through the image sniff. */
  private resolveResidencyMime(file: Express.Multer.File): string {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf') ||
      file.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    return isPdf
      ? 'application/pdf'
      : resolveImageMimeType(file.mimetype, file.originalname);
  }

  private buildResidencyDocument(
    doc: MobileProfileRow['residency_documents'][number],
  ): ResidencyDocumentDto {
    return {
      residency_document_id: doc.residency_document_id,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
      extracted_address: doc.extracted_address,
      uploaded_at: doc.createdAt.toISOString(),
    };
  }

  private async uploadAvatar(
    userId: string,
    role: MobileRoleType,
    file: Express.Multer.File,
  ): Promise<string> {
    if (file.size > MOBILE_PROFILE_MAX_AVATAR_BYTES) {
      const limitMb = MOBILE_PROFILE_MAX_AVATAR_BYTES / (1024 * 1024);
      throw new BadRequestException(
        `Profile photo must be ${limitMb} MB or smaller`,
      );
    }

    const mime = resolveImageMimeType(file.mimetype, file.originalname);
    if (
      !(MOBILE_PROFILE_ALLOWED_AVATAR_MIMES as readonly string[]).includes(mime)
    ) {
      throw new BadRequestException(
        'Only JPG, PNG, or WebP images are allowed',
      );
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `mobile-profiles/${userId}/avatar-${role.toLowerCase()}-${Date.now()}-${safeName}`;

    return this.s3Service.uploadToS3(key, file.buffer, mime);
  }

  /**
   * Completion measured against the stored record only. Every step maps to a
   * column the app can actually fill, so a fully registered volunteer who has
   * picked interests reads 100% instead of sitting at a fixed fraction.
   */
  /** Steps for the side being shown ([roleType] is the profiling role, not necessarily the registered one). */
  private buildCompletion(
    row: MobileProfileRow,
    roleType: MobileRoleType,
  ): ProfileCompletionDto {
    const hasAddress = Boolean(
      row.current_address?.trim() ||
      row.address_city?.trim() ||
      row.address_province?.trim(),
    );
    const personalDetails = Boolean(
      row.firstname?.trim() &&
      row.lastname?.trim() &&
      row.phone_number?.trim() &&
      hasAddress,
    );
    // A volunteer's ID check is the verification that owns their biometric (the
    // face matched against the ID at registration). Beneficiaries register
    // ID-less, so they have no verification step at all.
    const biometricSubmitted = row.user_verifications.length > 0;
    const selected = row.user_interest?.selected;
    const hasInterests = Array.isArray(selected) && selected.length > 0;

    const steps: Record<string, boolean> = {
      personal_details: personalDetails,
    };

    if (roleType === RoleType.VOLUNTEER) {
      steps.school_record = row.user_school_info.length > 0;
      steps.id_verification = biometricSubmitted;
      steps.interests = hasInterests;
    } else if (roleType === RoleType.BENEFICIARY) {
      steps.household_size = row.household_size != null;
    } else {
      steps.sign_in_method = Boolean(
        row.accounts[0]?.password || row.oauth_identities.length > 0,
      );
    }

    const entries = Object.entries(steps);
    const missing = entries.filter(([, done]) => !done).map(([key]) => key);
    const completedSteps = entries.length - missing.length;

    return {
      percent: Math.round((completedSteps / entries.length) * 100),
      complete: missing.length === 0,
      completed_steps: completedSteps,
      total_steps: entries.length,
      missing,
    };
  }

  private async buildVolunteer(
    row: MobileProfileRow,
  ): Promise<VolunteerProfileSectionDto> {
    const school = row.user_school_info[0];
    const attendance = await this.profileRepository.summarizeAttendance(
      row.user_id,
    );
    const selected = row.user_interest?.selected;

    return {
      school: school
        ? {
            id_number: school.id_number,
            department: school.department.name,
            major: school.major.name,
            year_level: school.year_level.name,
            graduation_year: school.graduation_year,
          }
        : null,
      interests: Array.isArray(selected) ? (selected as InterestCode[]) : [],
      service_hours: attendance.hours,
      activities_completed: attendance.completed,
      activities_registered: attendance.registered,
    };
  }

  private buildDonor(row: MobileProfileRow): DonorProfileSectionDto {
    return {
      sign_in_providers: row.oauth_identities.map((i) => i.provider),
      has_password: Boolean(row.accounts[0]?.password),
    };
  }

  private buildBeneficiary(): BeneficiaryProfileSectionDto {
    return {};
  }
}

/** Who is acting and from where, for the Activity Logs entry a mobile write leaves. */
export interface MobileAuditContext {
  actor: JwtPayload;
  context: RequestContextDto;
}

/** Field names whose submitted value differs from the stored one — the app sends
 *  every field each time, so this is what makes "Profile updated" say what changed. */
function diffProfileFields(
  existing: Record<string, unknown>,
  data: Record<string, unknown>,
): string[] {
  // Profile fields are scalars; anything else is compared by JSON so an object
  // never collapses to "[object Object]".
  const asText = (value: unknown): string =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : JSON.stringify(value ?? '');
  return Object.keys(data).filter(
    (key) => key in existing && asText(existing[key]) !== asText(data[key]),
  );
}
