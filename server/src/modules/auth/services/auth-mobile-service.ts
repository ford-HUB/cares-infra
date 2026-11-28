import {
  AuthRepository,
  registrationConflict,
  type RegistrationReviewRequestInput,
} from '../repositories/auth-repository';
import {
  CreateUserDto,
  NewUserAccountDto,
  ExtractIdDto,
  ExtractIdResponseDto,
  IdOcrResultDto,
  LoginDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RegisterFromSessionDto,
  RegisterUserResponseDto,
  RegistrationDocumentResponseDto,
  SendVerificationDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  VerifyResetOtpResponseDto,
  RegistrationSessionDto,
  type ManualRegistrationVolunteerType,
  StartSessionResponseDto,
  UploadIdResponseDto,
  VerifyFaceResponseDto,
} from '../dto/auth-mobile-dto';
import {
  BeneficiaryType,
  EmbeddingType,
  PermissionKey,
  RoleType,
  UserRequestKind,
} from '../../../infastructures/prisma/common/client';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { S3Service } from 'src/infastructures/s3/s3-service';
import { RedisService } from 'src/infastructures/redis/redis-service';
import { FrServiceClient } from 'src/infastructures/microservices/fr-service-client';
import { OcrServiceClient } from 'src/infastructures/microservices/ocr-service-client';
import { UcidServiceClient } from 'src/infastructures/microservices/ucid-service-client';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import { TemplateUtils } from 'src/shared/utils/templete-utils';
import { NodemailerService } from 'src/infastructures/nodemailer/nodemailer-service';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { SessionRegistry } from 'src/modules/sessions/services/session-registry';
import { LoginPolicyEnforcer } from 'src/modules/security-policy/services/login-policy-enforcer';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { AuditLogRecorder } from 'src/modules/audit-logs/services/audit-log-recorder';
import { AccessControlSiteService } from 'src/modules/access-control/services/access-control-site-service';
import { isStaffVolunteerRole } from 'src/shared/constants/mobile-role-types';
import type { RequestContextDto } from 'src/shared/decorators/request-context-decorator';
import { REGISTRATION_DOCUMENT_MAX_BYTES } from '../validators/auth-mobile-validator';
import { RegistrationApprovalGate } from './registration-approval-gate';
import { unlockedRoles } from 'src/shared/utils/unlocked-roles';
import { RegistrationStatusTokens } from './registration-status-tokens';

/** Audit log wording. */
const MANUAL_VOLUNTEER_LABEL: Record<ManualRegistrationVolunteerType, string> =
  {
    STUDENT: 'Student',
    STAFF: 'Staff',
    ALUMNI: 'Alumni',
    PARTNER_BARANGAY: 'Partner barangay',
  };

/** Review summary wording ("Registered a staff volunteer …"). */
const MANUAL_VOLUNTEER_ARTICLE_LABEL: Record<
  ManualRegistrationVolunteerType,
  string
> = {
  STUDENT: 'a student',
  STAFF: 'a staff',
  ALUMNI: 'an alumni',
  PARTNER_BARANGAY: 'a partner barangay',
};

/** Wrong codes before the reset code is discarded. */
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

/** `errors[].code` the app maps to the OTP screen. */
const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

@Injectable()
export class AuthMobileService {
  private readonly logger = new Logger(AuthMobileService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService,
    private readonly frServiceClient: FrServiceClient,
    private readonly ocrServiceClient: OcrServiceClient,
    private readonly ucidServiceClient: UcidServiceClient,
    private readonly nodemailerService: NodemailerService,
    private readonly jwtService: JwtService,
    private readonly loginActivityRecorder: LoginActivityRecorder,
    private readonly sessionRegistry: SessionRegistry,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
    private readonly auditLogRecorder: AuditLogRecorder,
    private readonly accessControlSiteService: AccessControlSiteService,
    private readonly registrationApprovalGate: RegistrationApprovalGate,
    private readonly registrationStatusTokens: RegistrationStatusTokens,
  ) {}

  /** Requires the email OTP like `registerFromSession`. */
  async registerUser(data: CreateUserDto): Promise<RegisterUserResponseDto> {
    // Beneficiaries need a director review, filed only by the session flow.
    if (data.role_type === RoleType.BENEFICIARY) {
      throw new BadRequestException(
        'Beneficiaries register through the app sign-up, which a director reviews',
      );
    }

    const normalizedEmail = data.account.email.trim().toLowerCase();
    await this.requireVerifiedEmail(normalizedEmail);

    const { registration_review: _review, ...user } =
      await this.createAccount(data);
    await this.clearOtpState(normalizedEmail);
    return { ...user, requires_approval: false };
  }

  private async createAccount(
    data: NewUserAccountDto,
    registrationRequest?: RegistrationReviewRequestInput,
  ) {
    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(
      data.account.password,
    );

    const hashedPassword = await bcrypt.hash(data.account.password, 10);
    return this.authRepository.createUser(
      {
        ...data,
        account: {
          ...data.account,
          password: hashedPassword,
        },
      },
      registrationRequest,
    );
  }

  async login(
    data: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const email = data.email.trim().toLowerCase();
    const attempt = { email, ipAddress, userAgent, source: 'MOBILE' as const };

    // Lockout only; hours and allowlist rules are portal-only (`LoginPolicyEnforcer`).
    await this.loginPolicyEnforcer.assertLoginAllowed(attempt);

    const account = await this.authRepository.findAccountForLogin(email);
    if (!account) {
      await this.loginActivityRecorder.record({
        ...attempt,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'No account matches this email',
      });
      // No account to attribute; kept only in the sign-in trail.
      throw new UnauthorizedException('Invalid email or password');
    }

    // Social-only accounts: same reply as a wrong password, so provider sign-ups aren't disclosed.
    if (!account.password) {
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'Account signs in through a social provider',
      });
      await this.recordSignIn(account, attempt, {
        outcome: 'FAILURE',
        description: 'Sign-in refused: account uses a social provider',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(data.password, account.password);
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'Incorrect password',
      });
      await this.recordSignIn(account, attempt, {
        outcome: 'FAILURE',
        description: 'Sign-in failed: incorrect password',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Admin-issued credentials expire everywhere.
    if (
      account.credential_expires_at &&
      account.credential_expires_at.getTime() <= Date.now()
    ) {
      const message =
        'These temporary credentials have expired — ask an administrator to issue new ones';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'CREDENTIAL_EXPIRED',
        failureReason: message,
      });
      await this.recordSignIn(account, attempt, {
        outcome: 'DENIED',
        description: 'Sign-in refused: temporary credentials expired',
      });
      throw new ForbiddenException(message);
    }

    // Gated by the "Use the mobile app" right.
    if (isStaffVolunteerRole(account.user.role.type)) {
      const held = await this.accessControlSiteService.effectivePermissionsFor(
        account.user.user_id,
      );
      if (!held.includes(PermissionKey.MOBILE_APP_ACCESS)) {
        const message =
          'Mobile app access is not enabled for this account — ask an administrator';
        await this.loginActivityRecorder.record({
          ...attempt,
          userId: account.user.user_id,
          outcome: 'ROLE_NOT_ALLOWED',
          failureReason: message,
        });
        await this.recordSignIn(account, attempt, {
          outcome: 'DENIED',
          description: 'Sign-in refused: mobile app access not granted',
        });
        throw new ForbiddenException(message);
      }
    }

    // Unverified accounts need a `purpose: 'login'` OTP via `verify-otp`.
    // Directors and coordinators skip it: the portal issued their account.
    if (
      !account.email_verified_at &&
      !isStaffVolunteerRole(account.user.role.type)
    ) {
      if (!(await this.isEmailVerified(email))) {
        const message =
          'Verify your email address to finish setting up this account';
        await this.loginActivityRecorder.record({
          ...attempt,
          userId: account.user.user_id,
          outcome: 'EMAIL_NOT_VERIFIED',
          failureReason: message,
        });
        await this.recordSignIn(account, attempt, {
          outcome: 'DENIED',
          description: 'Sign-in refused: email not verified',
        });
        throw new ForbiddenException({
          message,
          errors: [{ path: 'email', code: EMAIL_NOT_VERIFIED, message }],
        });
      }

      await this.authRepository.markEmailVerified(email);
      await this.clearOtpState(email);
    }

    // Self-registered beneficiaries/alumni wait for approval; the app shows "under review" on this 403.
    await this.registrationApprovalGate.assertApproved(
      account.user.user_id,
      attempt,
    );

    if (ipAddress) {
      await this.authRepository.recordLoginIp(account.user.user_id, ipAddress);
    }

    await this.loginActivityRecorder.record({
      ...attempt,
      userId: account.user.user_id,
      outcome: 'SUCCESS',
    });
    await this.recordSignIn(account, attempt, {
      outcome: 'SUCCESS',
      description: 'Signed in with email and password',
    });

    // Makes the token revocable (`SessionGuard`).
    const session = await this.sessionRegistry.create({
      userId: account.user.user_id,
      email: account.email,
      roleType: account.user.role.type,
      source: 'MOBILE',
      ipAddress,
      userAgent,
    });

    return {
      user_id: account.user.user_id,
      role_type: account.user.role.type,
      email: account.email,
      firstname: account.user.firstname,
      has_interests: account.user.user_interest !== null,
      unlocked_roles: unlockedRoles({
        roleType: account.user.role.type,
        beneficiaryType: account.user.beneficiary_type,
      }),
      access_token: this.jwtService.sign({
        sub: account.user.user_id,
        email: account.email,
        role_type: account.user.role.type,
        sid: session.session_id,
      }),
    };
  }

  /** Ends only this device's session. */
  async logout(user: JwtPayload, context: RequestContextDto): Promise<void> {
    if (user.sid) {
      await this.sessionRegistry.revoke(user.sid);
    }

    await this.auditLogRecorder.record({
      action: 'auth.mobile.signed-out',
      description: 'Signed out of the app',
      category: 'AUTHENTICATION',
      actor: user,
      targetType: 'user',
      targetLabel: user.email,
      targetId: user.sub,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      source: 'MOBILE',
    });
  }

  /** The holder's Activity Logs entry; `LoginActivity` feeds the portal monitor. */
  private async recordSignIn(
    account: {
      email: string;
      user: { user_id: string; role: { type: RoleType } };
    },
    attempt: { ipAddress?: string; userAgent?: string },
    entry: { outcome: 'SUCCESS' | 'FAILURE' | 'DENIED'; description: string },
  ): Promise<void> {
    await this.auditLogRecorder.record({
      action: 'auth.mobile.sign-in',
      description: entry.description,
      category: 'AUTHENTICATION',
      severity: entry.outcome === 'SUCCESS' ? 'INFO' : 'NOTICE',
      outcome: entry.outcome,
      actor: {
        sub: account.user.user_id,
        email: account.email,
        role_type: account.user.role.type,
      },
      targetType: 'user',
      targetLabel: account.email,
      targetId: account.user.user_id,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      source: 'MOBILE',
    });
  }

  async uploadID(
    front: Express.Multer.File,
    back: Express.Multer.File,
  ): Promise<UploadIdResponseDto> {
    let validation: any;
    try {
      validation = await this.ucidServiceClient.validateId(
        front.buffer,
        front.originalname,
        front.mimetype,
        back.buffer,
        back.originalname,
        back.mimetype,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'ID validation failed';
      throw new BadGatewayException(
        detail.includes('not ready') || detail.includes('not trained')
          ? detail
          : 'ID validation service is unavailable. Please try again shortly.',
      );
    }

    if (!validation.isValid) {
      throw new BadRequestException(
        validation.message ?? 'Uploaded images are not valid UCLM ID cards',
      );
    }

    const registrationId = randomUUID();
    const frontKey = `${registrationId}/id-front-${front.originalname}`;
    const backKey = `${registrationId}/id-back-${back.originalname}`;

    const idFrontImageUrl = await this.s3Service.uploadToS3(
      frontKey,
      front.buffer,
    );
    const idBackImageUrl = await this.s3Service.uploadToS3(
      backKey,
      back.buffer,
    );

    await this.saveSession(registrationId, {
      idFrontImageUrl,
      idBackImageUrl,
      roleType: null,
      selfieUrl: null,
      faceMatch: null,
      faceSimilarity: null,
      selfieEmbedding: null,
      ocrData: null,
      step: 'id_uploaded',
      createdAt: Date.now(),
    });

    return { registrationId };
  }

  /** Skips classifier and OCR; face matched, then reviewed by a director (ALUMNI_REGISTRATION). */
  async uploadAlumniID(
    front: Express.Multer.File,
    back: Express.Multer.File,
  ): Promise<UploadIdResponseDto> {
    return this.uploadReviewedID(front, back, 'alumni');
  }

  /** Skips classifier, face match and OCR; reviewed by a director (PARTNER_BARANGAY_REGISTRATION). */
  async uploadPartnerBarangayID(
    front: Express.Multer.File,
    back: Express.Multer.File,
  ): Promise<UploadIdResponseDto> {
    return this.uploadReviewedID(front, back, 'partner_barangay');
  }

  /** Unrecognised ID photo: skips all automatic checks; reviewed by a director (MANUAL_REGISTRATION). */
  async uploadManualID(
    front: Express.Multer.File,
    back: Express.Multer.File,
    volunteerType: ManualRegistrationVolunteerType,
  ): Promise<UploadIdResponseDto> {
    return this.uploadReviewedID(front, back, 'manual', volunteerType);
  }

  private async uploadReviewedID(
    front: Express.Multer.File,
    back: Express.Multer.File,
    idKind: 'alumni' | 'partner_barangay' | 'manual',
    manualVolunteerType?: ManualRegistrationVolunteerType,
  ): Promise<UploadIdResponseDto> {
    const idLabel = idKind === 'alumni' ? 'alumni ID' : 'ID';
    const sides = [
      ['front', front],
      ['back', back],
    ] as const;
    for (const [label, file] of sides) {
      if (!file.buffer?.length) {
        throw new BadRequestException(
          `The ${label} of the ${idLabel} is empty`,
        );
      }
      if (file.mimetype && !file.mimetype.startsWith('image/')) {
        throw new BadRequestException(
          `The ${label} of the ${idLabel} must be a photo`,
        );
      }
    }

    const registrationId = randomUUID();
    const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const keyPrefix =
      idKind === 'alumni'
        ? 'alumni-id'
        : idKind === 'manual'
          ? 'manual-id'
          : 'partner-barangay-id';
    const idFrontImageUrl = await this.s3Service.uploadToS3(
      `${registrationId}/${keyPrefix}-front-${safeName(front.originalname)}`,
      front.buffer,
    );
    const idBackImageUrl = await this.s3Service.uploadToS3(
      `${registrationId}/${keyPrefix}-back-${safeName(back.originalname)}`,
      back.buffer,
    );

    await this.saveSession(registrationId, {
      idFrontImageUrl,
      idBackImageUrl,
      roleType: RoleType.VOLUNTEER,
      idKind,
      ...(idKind === 'manual' ? { manualVolunteerType } : {}),
      selfieUrl: null,
      faceMatch: null,
      faceSimilarity: null,
      selfieEmbedding: null,
      ocrData: null,
      supportingDocument: null,
      step: 'id_uploaded',
      createdAt: Date.now(),
    });

    return { registrationId };
  }

  /** Beneficiaries: no ID or face; the email OTP vouches for them. */
  async startSession(roleType: RoleType): Promise<StartSessionResponseDto> {
    if (roleType !== RoleType.BENEFICIARY) {
      throw new BadRequestException(
        'Only beneficiary registration can start without an ID upload',
      );
    }

    const registrationId = randomUUID();

    await this.saveSession(registrationId, {
      idFrontImageUrl: null,
      idBackImageUrl: null,
      roleType,
      selfieUrl: null,
      faceMatch: null,
      faceSimilarity: null,
      selfieEmbedding: null,
      ocrData: null,
      supportingDocument: null,
      step: 'session_started',
      createdAt: Date.now(),
    });

    return { registrationId, step: 'session_started' };
  }

  /** Any file type; a second upload replaces the first. */
  async uploadRegistrationDocument(
    registrationId: string,
    file: Express.Multer.File,
  ): Promise<RegistrationDocumentResponseDto> {
    const session = await this.requireSession(registrationId);
    // Manual alumni and partner-barangay sign-ups still require their document; other manual ones may attach one.
    const isManual = session.idKind === 'manual';
    const isAlumni =
      session.idKind === 'alumni' ||
      (isManual && session.manualVolunteerType === 'ALUMNI');
    const isPartnerBarangay = session.idKind === 'partner_barangay';
    const isBeneficiary =
      session.roleType === RoleType.BENEFICIARY && !session.idFrontImageUrl;
    if (!isAlumni && !isPartnerBarangay && !isBeneficiary && !isManual) {
      throw new BadRequestException(
        'Documents are only attached to beneficiary, alumni, partner barangay and manual registrations',
      );
    }
    const documentLabel = isAlumni
      ? 'Certificate of Graduation'
      : 'supporting document';
    if (!file.buffer?.length) {
      throw new BadRequestException('The attached file is empty');
    }
    if (file.size > REGISTRATION_DOCUMENT_MAX_BYTES) {
      const limitMb = REGISTRATION_DOCUMENT_MAX_BYTES / (1024 * 1024);
      throw new BadRequestException(
        `The ${documentLabel} must be ${limitMb} MB or smaller`,
      );
    }

    const mime = file.mimetype || 'application/octet-stream';
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const url = await this.s3Service.uploadToS3(
      `${registrationId}/${isAlumni ? 'graduation-certificate' : 'supporting'}-${Date.now()}-${safeName}`,
      file.buffer,
      mime,
    );

    await this.saveSession(registrationId, {
      ...session,
      supportingDocument: {
        url,
        name: file.originalname,
        mime,
        sizeBytes: file.size,
      },
    });

    return {
      registrationId,
      document: { name: file.originalname, mime, size_bytes: file.size },
    };
  }

  async verifyFace(
    registrationId: string,
    selfie: Express.Multer.File,
  ): Promise<VerifyFaceResponseDto> {
    const session = await this.requireSession(registrationId);

    // Beneficiary sessions are ID-less and never enrol a face.
    if (!session.idFrontImageUrl) {
      throw new BadRequestException(
        'Face verification is only required for ID-backed registrations',
      );
    }
    // Director-checked IDs, not face matched (alumni are both).
    if (session.idKind === 'partner_barangay' || session.idKind === 'manual') {
      const who = session.idKind === 'manual' ? 'Manual' : 'Partner barangay';
      throw new BadRequestException(
        `${who} registrations are reviewed by a director instead of face verification`,
      );
    }

    const canVerifyFace =
      session.step === 'id_uploaded' ||
      session.step === 'face_verified' ||
      session.step === 'ocr_completed';

    if (!canVerifyFace) {
      throw new BadRequestException(
        'Invalid registration step for face verification',
      );
    }

    const idImage = await this.loadUploadedImage(
      session.idFrontImageUrl,
      'ID photo',
    );

    let verification: any;
    try {
      verification = await this.frServiceClient.verifyImages(
        idImage,
        'id-front.jpg',
        'image/jpeg',
        selfie.buffer,
        selfie.originalname,
        selfie.mimetype,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Face verification failed';
      if (this.isFaceDetectionError(detail)) {
        throw new BadRequestException(detail);
      }
      throw new BadGatewayException(
        'Face verification service is unavailable. Please try again shortly.',
      );
    }

    if (!verification.match) {
      return {
        registrationId,
        match: false,
        similarity: verification.similarity,
        threshold: verification.threshold,
        step: session.step,
        message: this.buildFaceMismatchMessage(
          verification.similarity,
          verification.threshold,
        ),
      };
    }

    const selfieKey = `${registrationId}/selfie-${selfie.originalname}`;
    const selfieUrl = await this.s3Service.uploadToS3(selfieKey, selfie.buffer);

    await this.saveSession(registrationId, {
      ...session,
      selfieUrl,
      faceMatch: true,
      faceSimilarity: verification.similarity,
      selfieEmbedding: verification.selfieEmbedding,
      step: 'face_verified',
      ocrData: null,
    });

    return {
      registrationId,
      match: true,
      similarity: verification.similarity,
      threshold: verification.threshold,
      step: 'face_verified',
      message: 'Face verified successfully',
    };
  }

  /** [volunteerType] 'STAFF' also reads the employee number ("ID NO.") and a "SURNAME, FIRST M." name. */
  async extractId(
    registrationId: string,
    volunteerType?: ExtractIdDto['volunteerType'],
  ): Promise<ExtractIdResponseDto> {
    const session = await this.requireSession(registrationId);

    if (!session.idFrontImageUrl || !session.idBackImageUrl) {
      throw new BadRequestException(
        'This registration has no uploaded ID to extract details from',
      );
    }
    if (
      session.idKind === 'alumni' ||
      session.idKind === 'partner_barangay' ||
      session.idKind === 'manual'
    ) {
      throw new BadRequestException(
        session.idKind === 'alumni'
          ? 'Alumni details are typed in, not read off the alumni ID'
          : session.idKind === 'manual'
            ? 'Manual registration details are typed in, not read off the ID'
            : 'Partner barangay details are typed in, not read off the ID',
      );
    }

    if (session.step !== 'face_verified' || !session.faceMatch) {
      throw new BadRequestException(
        'Face verification must complete before OCR extraction',
      );
    }

    const frontImage = await this.loadUploadedImage(
      session.idFrontImageUrl,
      'ID front photo',
    );
    const backImage = await this.loadUploadedImage(
      session.idBackImageUrl,
      'ID back photo',
    );

    let ocrData: IdOcrResultDto;
    try {
      ocrData = await this.ocrServiceClient.extractIdFields(
        frontImage,
        'id-front.jpg',
        backImage,
        'id-back.jpg',
        volunteerType,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'OCR extraction failed';
      if (detail.includes('Invalid image')) {
        throw new BadRequestException(detail);
      }
      throw new BadGatewayException(
        'OCR service is unavailable. Please try again shortly.',
      );
    }

    await this.saveSession(registrationId, {
      ...session,
      ocrData,
      step: 'ocr_completed',
    });

    return {
      registrationId,
      step: 'ocr_completed',
      ocrData,
    };
  }

  async registerFromSession(
    data: RegisterFromSessionDto,
    context: RequestContextDto = {},
  ): Promise<RegisterUserResponseDto> {
    const session = await this.requireSession(data.registrationId);

    await this.requireVerifiedEmail(data.account.email);

    // Locked to the starting role so ID-backed roles always need an ID.
    const isIdLess = !session.idFrontImageUrl;
    if (
      isIdLess &&
      (session.roleType !== RoleType.BENEFICIARY ||
        data.role_type !== RoleType.BENEFICIARY)
    ) {
      throw new BadRequestException(
        'This registration session requires an uploaded ID',
      );
    }

    // Locked to Volunteer; face verified, then director-reviewed.
    const isAlumni = session.idKind === 'alumni';
    if (isAlumni && data.role_type !== RoleType.VOLUNTEER) {
      throw new BadRequestException(
        'An alumni registration can only create a volunteer account',
      );
    }

    // Locked to Volunteer; must name the partner barangay.
    const isPartnerBarangay = session.idKind === 'partner_barangay';
    if (isPartnerBarangay && data.role_type !== RoleType.VOLUNTEER) {
      throw new BadRequestException(
        'A partner barangay registration can only create a volunteer account',
      );
    }
    // Locked to Volunteer; director verifies the ID by hand.
    const isManual = session.idKind === 'manual';
    if (isManual && data.role_type !== RoleType.VOLUNTEER) {
      throw new BadRequestException(
        'A manual registration can only create a volunteer account',
      );
    }
    const manualVolunteerType = session.manualVolunteerType ?? 'STAFF';
    const isManualAlumni = isManual && manualVolunteerType === 'ALUMNI';
    const isManualPartnerBarangay =
      isManual && manualVolunteerType === 'PARTNER_BARANGAY';
    const keepsPartnerBarangay = isPartnerBarangay || isManualPartnerBarangay;
    if (keepsPartnerBarangay && !data.partner_barangay) {
      throw new BadRequestException(
        'Pick the partner barangay you are registering through',
      );
    }
    const isDirectorReviewedId = isAlumni || isPartnerBarangay || isManual;
    const requiresApproval = isIdLess || isDirectorReviewedId;

    // Students passed ID, face and OCR checks, so no director review.
    const isStudentBeneficiary =
      data.role_type === RoleType.BENEFICIARY && !isIdLess;
    if (isStudentBeneficiary && isDirectorReviewedId) {
      throw new BadRequestException(
        'A student beneficiary registers with a UC school ID',
      );
    }

    // Reviewed sign-ups can't be filed without their document.
    const supportingDocument = session.supportingDocument ?? null;
    if (isIdLess && !supportingDocument) {
      throw new BadRequestException(
        'Attach a supporting document before submitting your registration',
      );
    }
    if ((isAlumni || isManualAlumni) && !supportingDocument) {
      throw new BadRequestException(
        'Attach your Certificate of Graduation before submitting your registration',
      );
    }
    if (keepsPartnerBarangay && !supportingDocument) {
      throw new BadRequestException(
        'Attach a supporting document before submitting your registration',
      );
    }

    if (
      !isIdLess &&
      !isDirectorReviewedId &&
      session.step !== 'ocr_completed'
    ) {
      throw new BadRequestException(
        'OCR extraction must complete before registration',
      );
    }

    // Partner-barangay and manual sign-ups enrol no face; other ID-backed roles need the matched face.
    const enrolsFace = !isManual && !isPartnerBarangay;
    let biometric: CreateUserDto['biometric'];
    let schoolIdUrl: string | undefined;
    if (session.idFrontImageUrl && !enrolsFace) {
      schoolIdUrl = this.s3Service.buildObjectUrl(
        this.s3Service.resolveObjectKey(session.idFrontImageUrl),
      );
    } else if (session.idFrontImageUrl) {
      if (
        !session.faceMatch ||
        !session.selfieUrl ||
        !session.selfieEmbedding
      ) {
        throw new BadRequestException(
          'Face verification data is missing from registration session',
        );
      }

      biometric = {
        face_url: this.s3Service.buildObjectUrl(
          this.s3Service.resolveObjectKey(session.selfieUrl),
        ),
        embedding: session.selfieEmbedding,
        embedding_type: EmbeddingType.FACE,
        isActive: true,
      };
      schoolIdUrl = this.s3Service.buildObjectUrl(
        this.s3Service.resolveObjectKey(session.idFrontImageUrl),
      );
    }

    // Failures keep the session and verified flag for a retry; check uniqueness first for a clean 409.
    await this.assertRegistrationDetailsAvailable({
      email: data.account.email,
      phoneNumber: data.phone_number,
      idNumber: data.school_info.id_number,
    });

    const fullName = `${data.firstname} ${data.lastname}`.trim();
    const actorName = fullName || 'Registrant';
    let registrationRequest: RegistrationReviewRequestInput | undefined;
    if (isManual) {
      registrationRequest = {
        kind: UserRequestKind.MANUAL_REGISTRATION,
        summary: `Registered ${MANUAL_VOLUNTEER_ARTICLE_LABEL[manualVolunteerType]} volunteer account manually${
          isManualPartnerBarangay ? ` through ${data.partner_barangay}` : ''
        } — the app could not recognize the uploaded ID, so it skipped the automatic ID check and face scan. Verify the ID before approving.`,
        actorName,
        idFrontUrl: session.idFrontImageUrl ?? undefined,
        idBackUrl: session.idBackImageUrl ?? undefined,
        document: supportingDocument ?? undefined,
      };
    } else if (isAlumni) {
      registrationRequest = {
        kind: UserRequestKind.ALUMNI_REGISTRATION,
        summary:
          'Registered an alumni volunteer account and is waiting for approval to sign in. Their face was matched against the alumni ID.',
        actorName,
        idFrontUrl: session.idFrontImageUrl ?? undefined,
        idBackUrl: session.idBackImageUrl ?? undefined,
        selfieUrl: session.selfieUrl ?? undefined,
        faceSimilarity: session.faceSimilarity ?? undefined,
        document: supportingDocument ?? undefined,
      };
    } else if (isPartnerBarangay) {
      registrationRequest = {
        kind: UserRequestKind.PARTNER_BARANGAY_REGISTRATION,
        summary: `Registered a volunteer account through ${data.partner_barangay} and is waiting for approval to sign in. The ID was not photo-checked or face matched — verify it before approving.`,
        actorName,
        idFrontUrl: session.idFrontImageUrl ?? undefined,
        idBackUrl: session.idBackImageUrl ?? undefined,
        document: supportingDocument ?? undefined,
      };
    } else if (supportingDocument) {
      registrationRequest = {
        kind: UserRequestKind.BENEFICIARY_REGISTRATION,
        summary:
          'Registered a beneficiary account and is waiting for approval to sign in.',
        actorName,
        document: supportingDocument,
      };
    }

    const { registration_review: review, ...user } = await this.createAccount(
      {
        firstname: data.firstname,
        lastname: data.lastname,
        middle_name: data.middle_name,
        role_type: data.role_type,
        gender: data.gender,
        age: data.age,
        current_address: data.current_address,
        phone_number: data.phone_number,
        avatar: data.avatar,
        account: data.account,
        school_info: { ...data.school_info, school_id_url: schoolIdUrl },
        biometric,
        partner_barangay: keepsPartnerBarangay
          ? data.partner_barangay
          : undefined,
        beneficiary_type:
          data.role_type === RoleType.BENEFICIARY
            ? isStudentBeneficiary
              ? BeneficiaryType.STUDENT
              : BeneficiaryType.REGULAR
            : undefined,
      },
      // Same transaction as the account, so it never signs in without a review.
      registrationRequest,
    );

    const normalizedEmail = data.account.email.trim().toLowerCase();
    await this.clearOtpState(normalizedEmail);
    await this.redisService.delete(this.registrationKey(data.registrationId));

    if (review) {
      await this.sendRegistrationSubmittedEmail(normalizedEmail, {
        firstname: data.firstname,
        reference: `REQ-${String(review.reference_number).padStart(3, '0')}`,
        userRequestId: review.user_request_id,
        registrationLabel: isManual
          ? 'manual volunteer'
          : isAlumni
            ? 'alumni volunteer'
            : isPartnerBarangay
              ? 'partner barangay volunteer'
              : 'beneficiary',
        manual: isManual,
      });
    }

    await this.auditLogRecorder.record({
      action: 'auth.mobile.registered',
      description: isIdLess
        ? 'Account created with email verification; awaiting director approval'
        : isStudentBeneficiary
          ? 'Student beneficiary account created with ID upload and face verification'
          : isManual
            ? `${MANUAL_VOLUNTEER_LABEL[manualVolunteerType]} account created through manual registration; awaiting director approval`
            : isAlumni
              ? 'Alumni account created with alumni ID upload; awaiting director approval'
              : isPartnerBarangay
                ? 'Partner barangay volunteer account created with ID upload; awaiting director approval'
                : 'Account created with ID upload and face verification',
      category: 'AUTHENTICATION',
      actor: {
        sub: user.user_id,
        email: normalizedEmail,
        role_type: data.role_type,
      },
      targetType: 'user',
      targetLabel: normalizedEmail,
      targetId: user.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      source: 'MOBILE',
      metadata: {
        role: data.role_type,
        ...(isManual
          ? {
              manual_registration: 'true',
              volunteer_type: manualVolunteerType,
            }
          : {}),
      },
    });

    return { ...user, requires_approval: requiresApproval };
  }

  /** Links to the public status page (no sign-in until approved). Failures never undo the registration. */
  private async sendRegistrationSubmittedEmail(
    email: string,
    details: {
      firstname: string;
      reference: string;
      userRequestId: string;
      registrationLabel: string;
      manual: boolean;
    },
  ): Promise<void> {
    const heading = 'We received your CARES registration';
    try {
      const html = await TemplateUtils.compileTemplate(
        'registration-submitted.html',
        {
          heading,
          username: details.firstname.trim() || email,
          reference: details.reference,
          registrationLabel: details.registrationLabel,
          manual: details.manual,
          statusUrl: this.registrationStatusTokens.statusUrl(
            details.userRequestId,
          ),
        },
      );
      await this.nodemailerService.sendEmail(email, heading, html);
    } catch (error) {
      this.logger.warn(
        `Could not email the ${details.reference} submission notice to ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async getRegistrationSession(
    registrationId: string,
  ): Promise<RegistrationSessionDto | null> {
    return this.redisService.get<RegistrationSessionDto>(
      this.registrationKey(registrationId),
    );
  }

  private async requireSession(
    registrationId: string,
  ): Promise<RegistrationSessionDto> {
    const session = await this.getRegistrationSession(registrationId);
    if (!session) {
      throw new NotFoundException('Registration session not found or expired');
    }
    return session;
  }

  private async saveSession(
    registrationId: string,
    session: RegistrationSessionDto,
  ): Promise<void> {
    await this.redisService.set(
      this.registrationKey(registrationId),
      session,
      DurationUtils.THIRTY_MINUTES,
    );
  }

  private async loadUploadedImage(
    storedKeyOrUrl: string,
    label: string,
  ): Promise<Buffer> {
    try {
      return await this.s3Service.getObjectBuffer(storedKeyOrUrl);
    } catch {
      throw new BadRequestException(
        `Unable to load your ${label}. Please go back and upload a clear ID image again.`,
      );
    }
  }

  private buildFaceMismatchMessage(
    similarity: number,
    threshold: number,
  ): string {
    const matchPct = Math.round(similarity * 100);
    const requiredPct = Math.round(threshold * 100);
    return `Your selfie does not match the face on your ID (${matchPct}% match, ${requiredPct}% required). Adjust lighting, face the camera directly, and try again.`;
  }

  private isFaceDetectionError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('face') ||
      normalized.includes('detect') ||
      normalized.includes('image')
    );
  }

  private registrationKey(registrationId: string): string {
    return `registration:${registrationId}`;
  }

  async sendOtpEmail(data: SendVerificationDto) {
    const normalizedEmail = data.email.trim().toLowerCase();

    if (data.purpose === 'login') {
      // Only accounts awaiting OTP; the verified flag is only spent by `login` with the password.
      await this.assertAwaitingEmailVerification(normalizedEmail);
    } else {
      // Check unique fields before sending, so the form can point at the clash.
      await this.assertRegistrationDetailsAvailable({
        email: normalizedEmail,
        phoneNumber: data.phone_number,
        idNumber: data.id_number,
      });
    }

    // Reuse a live code unless `resend`, to avoid inbox spam.
    const existingOtp = data.resend
      ? null
      : await this.redisService.get<string>(this.otpKey(normalizedEmail));
    if (existingOtp) {
      const expiresInSeconds = await this.redisService.ttl(
        this.otpKey(normalizedEmail),
      );
      const verified = await this.isEmailVerified(normalizedEmail);

      return {
        email: normalizedEmail,
        sent: false,
        reused: true,
        verified,
        expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : 0,
      };
    }

    const otp = randomInt(100000, 1000000).toString();
    const template = await TemplateUtils.compileTemplate(
      'otp-verification.html',
      {
        code: otp,
        username: normalizedEmail,
        expiresInMinutes: DurationUtils.ONE_MINUTE / 60,
      },
    );

    try {
      await this.nodemailerService.sendEmail(
        normalizedEmail,
        'OTP Verification',
        template,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Email delivery failed';
      throw new BadGatewayException(
        `Unable to send verification email. ${detail}`,
      );
    }

    await this.clearOtpState(normalizedEmail);
    await this.redisService.set(
      this.otpKey(normalizedEmail),
      otp,
      DurationUtils.ONE_MINUTE,
    );

    return {
      email: normalizedEmail,
      sent: true,
      reused: false,
      verified: false,
      expiresInSeconds: DurationUtils.ONE_MINUTE,
    };
  }

  async getVerificationStatus(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const expiresInSeconds = await this.redisService.ttl(
      this.otpKey(normalizedEmail),
    );
    const hasActiveCode = expiresInSeconds > 0;
    const verified = await this.isEmailVerified(normalizedEmail);

    return {
      email: normalizedEmail,
      hasActiveCode,
      verified,
      expiresInSeconds: hasActiveCode ? expiresInSeconds : 0,
    };
  }

  async verifyOtpEmail(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const storedOtp = await this.redisService.get<string>(
      this.otpKey(normalizedEmail),
    );

    if (!storedOtp) {
      throw new BadRequestException(
        'Verification code expired or not found. Please request a new code.',
      );
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.redisService.set(
      this.otpVerifiedKey(normalizedEmail),
      'true',
      DurationUtils.THIRTY_MINUTES,
    );

    const expiresInSeconds = await this.redisService.ttl(
      this.otpKey(normalizedEmail),
    );

    return {
      email: normalizedEmail,
      verified: true,
      expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : 0,
    };
  }

  /** Reveals that an account exists, which the sign-up form already does. */
  async requestPasswordReset(
    email: string,
    context: RequestContextDto = {},
  ): Promise<ForgotPasswordResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();

    const account = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!account) {
      throw new NotFoundException('No account is registered with this email');
    }

    // Social-only accounts have no password to reset.
    if (!account.password) {
      throw new BadRequestException(
        'This account signs in through Google or Facebook. Use that provider instead.',
      );
    }

    const existingOtp = await this.redisService.get<string>(
      this.resetOtpKey(normalizedEmail),
    );
    if (existingOtp) {
      const ttl = await this.redisService.ttl(
        this.resetOtpKey(normalizedEmail),
      );
      return {
        email: normalizedEmail,
        sent: false,
        reused: true,
        expiresInSeconds: ttl > 0 ? ttl : 0,
      };
    }

    const otp = randomInt(100000, 1000000).toString();
    const template = await TemplateUtils.compileTemplate(
      'password-reset-otp.html',
      {
        code: otp,
        username: account.user.firstname || normalizedEmail,
        expiresInMinutes: DurationUtils.TEN_MINUTES / 60,
      },
    );

    try {
      await this.nodemailerService.sendEmail(
        normalizedEmail,
        'Reset your CARES password',
        template,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Email delivery failed';
      throw new BadGatewayException(`Unable to send reset email. ${detail}`);
    }

    await this.clearPasswordResetState(normalizedEmail);
    await this.redisService.set(
      this.resetOtpKey(normalizedEmail),
      otp,
      DurationUtils.TEN_MINUTES,
    );

    // Logged before use so the holder can spot unrequested resets.
    await this.auditLogRecorder.record({
      action: 'auth.mobile.password-reset.requested',
      description: 'Password reset code requested by email',
      category: 'AUTHENTICATION',
      severity: 'NOTICE',
      // The recorder re-reads the real role.
      actor: {
        sub: account.user.user_id,
        email: normalizedEmail,
        role_type: RoleType.VOLUNTEER,
      },
      targetType: 'user',
      targetLabel: normalizedEmail,
      targetId: account.user.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      source: 'MOBILE',
    });

    return {
      email: normalizedEmail,
      sent: true,
      reused: false,
      expiresInSeconds: DurationUtils.TEN_MINUTES,
    };
  }

  /** Spends the code for a single-use reset token. */
  async verifyPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<VerifyResetOtpResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const storedOtp = await this.redisService.get<string>(
      this.resetOtpKey(normalizedEmail),
    );

    if (!storedOtp) {
      throw new BadRequestException(
        'Reset code expired or not found. Please request a new code.',
      );
    }

    if (storedOtp !== otp.trim()) {
      const attempts = await this.recordFailedResetAttempt(normalizedEmail);
      if (attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        await this.clearPasswordResetState(normalizedEmail);
        throw new BadRequestException(
          'Too many incorrect codes. Please request a new one.',
        );
      }
      throw new BadRequestException('Invalid reset code');
    }

    const resetToken = randomUUID();
    await this.redisService.delete(this.resetOtpKey(normalizedEmail));
    await this.redisService.delete(this.resetAttemptsKey(normalizedEmail));
    await this.redisService.set(
      this.resetTokenKey(normalizedEmail),
      resetToken,
      DurationUtils.FIFTEEN_MINUTES,
    );

    return {
      email: normalizedEmail,
      resetToken,
      expiresInSeconds: DurationUtils.FIFTEEN_MINUTES,
    };
  }

  /** Then signs out every device. */
  async resetPassword(
    data: ResetPasswordDto,
    context: RequestContextDto = {},
  ): Promise<ResetPasswordResponseDto> {
    const normalizedEmail = data.email.trim().toLowerCase();

    const storedToken = await this.redisService.get<string>(
      this.resetTokenKey(normalizedEmail),
    );
    if (!storedToken || storedToken !== data.resetToken) {
      throw new UnauthorizedException(
        'This reset session expired. Please start again.',
      );
    }

    const account = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!account) {
      throw new NotFoundException('No account is registered with this email');
    }

    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(data.newPassword);

    if (account.password) {
      const reused = await bcrypt
        .compare(data.newPassword, account.password)
        .catch(() => false);
      if (reused) {
        throw new BadRequestException(
          'Your new password must be different from your current one',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.authRepository.updatePasswordByEmail(
      normalizedEmail,
      hashedPassword,
    );

    await this.clearPasswordResetState(normalizedEmail);
    // Kill any session issued under the old password.
    await this.sessionRegistry.revokeAllForUser(account.user.user_id);

    await this.auditLogRecorder.record({
      action: 'auth.mobile.password-reset',
      description:
        'Password reset by email code; other devices were signed out',
      category: 'AUTHENTICATION',
      severity: 'NOTICE',
      // Fallback only; the recorder re-reads the real role.
      actor: {
        sub: account.user.user_id,
        email: normalizedEmail,
        role_type: RoleType.VOLUNTEER,
      },
      targetType: 'user',
      targetLabel: normalizedEmail,
      targetId: account.user.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      source: 'MOBILE',
    });

    return { email: normalizedEmail, updated: true };
  }

  private resetOtpKey(email: string): string {
    return `password-reset:otp:${email}`;
  }

  private resetTokenKey(email: string): string {
    return `password-reset:token:${email}`;
  }

  private resetAttemptsKey(email: string): string {
    return `password-reset:attempts:${email}`;
  }

  /** Lives as long as the code. */
  private async recordFailedResetAttempt(email: string): Promise<number> {
    const key = this.resetAttemptsKey(email);
    const current = (await this.redisService.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.redisService.set(key, next, DurationUtils.TEN_MINUTES);
    return next;
  }

  private async clearPasswordResetState(email: string): Promise<void> {
    await this.redisService.delete(this.resetOtpKey(email));
    await this.redisService.delete(this.resetTokenKey(email));
    await this.redisService.delete(this.resetAttemptsKey(email));
  }

  private otpKey(email: string): string {
    return `otp:${email}`;
  }

  private otpVerifiedKey(email: string): string {
    return `otp-verified:${email}`;
  }

  private async isEmailVerified(email: string): Promise<boolean> {
    const verified = await this.redisService.get<string>(
      this.otpVerifiedKey(email),
    );
    return verified === 'true';
  }

  private async clearOtpState(email: string): Promise<void> {
    await this.redisService.delete(this.otpKey(email));
    await this.redisService.delete(this.otpVerifiedKey(email));
  }

  private async assertRegistrationDetailsAvailable(details: {
    email: string;
    phoneNumber?: string;
    idNumber?: string;
  }): Promise<void> {
    const normalizedEmail = details.email.trim().toLowerCase();
    if (await this.authRepository.findUserByEmail(normalizedEmail)) {
      throw registrationConflict('email');
    }

    const phoneNumber = details.phoneNumber?.trim();
    if (
      phoneNumber &&
      (await this.authRepository.findPhoneNumberOwner(phoneNumber))
    ) {
      throw registrationConflict('phone_number');
    }

    const idNumber = details.idNumber?.trim();
    if (idNumber && (await this.authRepository.findSchoolIdOwner(idNumber))) {
      throw registrationConflict('id_number');
    }
  }

  private async assertAwaitingEmailVerification(email: string): Promise<void> {
    const account = await this.authRepository.findAccountForLogin(email);
    if (!account || account.email_verified_at) {
      throw new BadRequestException(
        'This account does not need email verification',
      );
    }
  }

  private async requireVerifiedEmail(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const verified = await this.isEmailVerified(normalizedEmail);

    if (!verified) {
      throw new BadRequestException(
        'Email verification is required before registration',
      );
    }
  }
}
