import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterestCode,
  BeneficiaryType,
  RoleType,
  UserRequestKind,
  UserRequestStatus,
} from '../../../infastructures/prisma/common/client';
import {
  OcrServiceClient,
  OcrUnreadableError,
} from '../../../infastructures/microservices/ocr-service-client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { resolveImageMimeType } from '../../../shared/utils/image-mime';
import {
  isStaffVolunteerRole,
  toMobileRole,
  type MobileRoleType,
  type MobileSignInRoleType,
} from '../../../shared/constants/mobile-role-types';
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
  ResidencyReviewDto,
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
} from '../validators/profile-mobile-validator';
import {
  ProfileCacheService,
  type CachedProfileAsset,
} from './profile-cache-service';
import { RankingsBoardService } from '../../rankings/services/rankings-board-service';
import { unlockedRoles } from '../../../shared/utils/unlocked-roles';

/** [viewRole] if given, else the registered role's side. Staff only have the Volunteer side. */
function resolveProfilingRole(
  registeredRole: RoleType,
  viewRole?: MobileRoleType,
): MobileRoleType {
  const home = toMobileRole(registeredRole);
  if (!home) {
    throw new ForbiddenException('Profile is not available for this role');
  }
  if (isStaffVolunteerRole(registeredRole) && viewRole && viewRole !== home) {
    throw new ForbiddenException(
      'Only the Volunteer side is available to staff accounts',
    );
  }
  return viewRole ?? home;
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
    private readonly rankingsBoardService: RankingsBoardService,
  ) {}

  /** Only the [viewRole] section is filled; completion is measured for that side (default: registered role). */
  async getMyProfile(
    userId: string,
    viewRole?: MobileRoleType,
  ): Promise<MobileProfileDto> {
    const row = await this.profileRepository.findMobileProfile(userId);
    if (!row) {
      throw new NotFoundException('User not found');
    }

    // Narrowed by the controller; resolveProfilingRole re-checks.
    const roleType = row.role.type as MobileSignInRoleType;
    const profilingRole = resolveProfilingRole(roleType, viewRole);

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
      residency_review: this.buildResidencyReview(row),
      has_profile_image: Boolean(this.roleAvatarUrl(row, profilingRole)),
      sign_in_providers: row.oauth_identities.map((i) => i.provider),
      has_password: Boolean(account?.password),
      member_since: row.createdAt.toISOString(),
      unlocked_roles: unlockedRoles({
        roleType: row.role.type,
        beneficiaryType: row.beneficiary_type,
      }),
      profile_completion: this.buildCompletion(row, profilingRole),
      volunteer,
      donor,
      beneficiary,
    };
  }

  /** Returns the re-read profile. */
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
    const registeredRole = existing.role.type;
    const avatarRole = resolveProfilingRole(registeredRole, viewRole);

    const phoneOwner = await this.profileRepository.findPhoneOwner(
      data.phone_number,
      userId,
    );
    if (phoneOwner) {
      throw new ConflictException('Phone number is already in use');
    }

    // Per-side photo. The registered role mirrors onto `User.avatar` for portal views;
    // staff's Volunteer side never matches, so their portal photo stays.
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

    // The avatar stream reads through the portal-row cache.
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

  /** Falls back to `User.avatar` for the registered role (pre per-role uploads). */
  async getRoleAvatar(
    userId: string,
    viewRole?: MobileRoleType,
  ): Promise<CachedProfileAsset> {
    const row = await this.profileRepository.findMobileProfile(userId);
    if (!row) {
      throw new NotFoundException('User not found');
    }
    const role = resolveProfilingRole(row.role.type, viewRole);
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

  private roleAvatarUrl(
    row: MobileProfileRow,
    role: MobileRoleType,
  ): string | null {
    const own = row.role_avatars.find((a) => a.role_type === role)?.avatar_url;
    if (own) {
      return own;
    }
    // Staff land on the Volunteer side.
    return role === toMobileRole(row.role.type) ? row.avatar : null;
  }

  private roleAvatarKind(role: MobileRoleType): ProfileAssetKind {
    return `avatar:${role}`;
  }

  /** Same session as registration, so the ID and face are already validated. Values are OCR-only by design. */
  async applySchoolRecordFromSession(
    userId: string,
    registrationId: string,
    audit?: MobileAuditContext,
  ): Promise<MobileProfileDto> {
    const existing = await this.profileRepository.findMobileProfile(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    // A student beneficiary's Volunteer side shares the school record.
    const isStudentBeneficiary =
      existing.role.type === RoleType.BENEFICIARY &&
      existing.beneficiary_type === BeneficiaryType.STUDENT;
    if (existing.role.type !== RoleType.VOLUNTEER && !isStudentBeneficiary) {
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

  /** Unreadable documents store nothing; on success the file is kept in S3. */
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
    resolveProfilingRole(existing.role.type, viewRole);

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

    // Profile completes only once a director accepts the document (buildCompletion).
    const actorName =
      `${existing.firstname ?? ''} ${existing.lastname ?? ''}`.trim() ||
      'Requester';
    await this.profileRepository.applyResidencyDocument(
      userId,
      {
        file_url: fileUrl,
        file_name: file.originalname,
        mime_type: mime,
        size_bytes: file.size,
        extracted_address: address,
      },
      {
        summary: `Uploaded a proof of residency — address read as "${address}".`,
        actorName,
      },
    );

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

  /** PDFs keep their type; others are sniffed as images. */
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

  /** Steps for the profiling role, measured only against stored columns. */
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
    // Beneficiaries register ID-less, so no verification step.
    const biometricSubmitted = row.user_verifications.length > 0;
    const selected = row.user_interest?.selected;
    const hasInterests = Array.isArray(selected) && selected.length > 0;

    const steps: Record<string, boolean> = {
      personal_details: personalDetails,
    };
    const pendingReview: string[] = [];

    if (roleType === RoleType.VOLUNTEER) {
      // Staff were vetted, not ID/face registered.
      const staff = isStaffVolunteerRole(row.role.type);
      // Director-approved and partner-barangay volunteers have no school record.
      if (
        !staff &&
        !this.isDirectorGrantedVolunteer(row) &&
        !row.partner_barangay
      ) {
        steps.school_record = row.user_school_info.length > 0;
      }
      if (!staff) {
        steps.id_verification = biometricSubmitted;
      }
      steps.interests = hasInterests;
    } else if (roleType === RoleType.BENEFICIARY) {
      steps.household_size = row.household_size != null;
      // Profile-uploaded residency proofs need director acceptance.
      const review = this.latestResidencyReview(row);
      if (review && review.status !== UserRequestStatus.ACCEPTED) {
        steps.residency_document = false;
        if (review.status === UserRequestStatus.PENDING) {
          pendingReview.push('residency_document');
        }
      }
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
      pending_review: pendingReview,
    };
  }

  /** Any status. */
  private latestResidencyReview(row: MobileProfileRow) {
    return (
      row.user_requests.find(
        (r) => r.kind === UserRequestKind.RESIDENCY_VERIFICATION,
      ) ?? null
    );
  }

  private buildResidencyReview(
    row: MobileProfileRow,
  ): ResidencyReviewDto | null {
    const review = this.latestResidencyReview(row);
    if (!review) return null;
    return {
      status: review.status,
      rejection_reason: review.rejection_reason,
      // Re-uploads replace the open request's file.
      submitted_at: (review.status === UserRequestStatus.PENDING
        ? review.updatedAt
        : review.createdAt
      ).toISOString(),
      decided_at: review.decided_at?.toISOString() ?? null,
    };
  }

  private async buildVolunteer(
    row: MobileProfileRow,
  ): Promise<VolunteerProfileSectionDto> {
    const school = row.user_school_info[0];
    const [attendance, score] = await Promise.all([
      this.profileRepository.summarizeAttendance(row.user_id),
      this.rankingsBoardService.scoreVolunteer(row.user_id),
    ]);
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
      other_interest: row.user_interest?.other_interest ?? null,
      access_granted_by_director: this.isDirectorGrantedVolunteer(row),
      partner_barangay: row.partner_barangay ?? null,
      service_hours: attendance.hours,
      activities_completed: attendance.completed,
      activities_registered: attendance.registered,
      ranking_points: score.points,
    };
  }

  /** Donor/beneficiary whose Volunteer side was opened by role-access approval. */
  private isDirectorGrantedVolunteer(row: MobileProfileRow): boolean {
    return (
      row.role.type !== RoleType.VOLUNTEER &&
      row.user_requests.some((r) => r.kind === UserRequestKind.ROLE_ACCESS)
    );
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

export interface MobileAuditContext {
  actor: JwtPayload;
  context: RequestContextDto;
}

/** The app sends every field, so this names what changed. */
function diffProfileFields(
  existing: Record<string, unknown>,
  data: Record<string, unknown>,
): string[] {
  // JSON-compare non-scalars to avoid "[object Object]".
  const asText = (value: unknown): string =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : JSON.stringify(value ?? '');
  return Object.keys(data).filter(
    (key) => key in existing && asText(existing[key]) !== asText(data[key]),
  );
}
