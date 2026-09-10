import {
  AuthRepository,
  registrationConflict,
} from '../repositories/auth-repository';
import {
  CreateUserDto,
  ExtractIdResponseDto,
  IdOcrResultDto,
  LoginDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RegisterFromSessionDto,
  SendVerificationDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  VerifyResetOtpResponseDto,
  RegistrationSessionDto,
  StartSessionResponseDto,
  UploadIdResponseDto,
  VerifyFaceResponseDto,
} from '../dto/auth-mobile-dto';
import {
  EmbeddingType,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { S3Service } from 'src/infastructures/s3/s3-service';
import { RedisService } from 'src/infastructures/redis/redis-service';
import {
  FrEmbedResult,
  FrServiceClient,
} from 'src/infastructures/microservices/fr-service-client';
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

/** Wrong codes tolerated before the reset code is thrown away. */
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthMobileService {
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
  ) {}

  async registerUser(data: CreateUserDto) {
    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(
      data.account.password,
    );

    const hashedPassword = await bcrypt.hash(data.account.password, 10);
    return this.authRepository.createUser({
      ...data,
      account: {
        ...data.account,
        password: hashedPassword,
      },
    });
  }

  async login(
    data: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const email = data.email.trim().toLowerCase();
    const attempt = { email, ipAddress, userAgent, source: 'MOBILE' as const };

    // Lockout only, on this side — see `LoginPolicyEnforcer` for why the hours and
    // allowlist rules stop at the portal.
    await this.loginPolicyEnforcer.assertLoginAllowed(attempt);

    const account = await this.authRepository.findAccountForLogin(email);
    if (!account) {
      await this.loginActivityRecorder.record({
        ...attempt,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'No account matches this email',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // A social-only account has no stored hash. Refusing here — rather than letting
    // bcrypt.compare see a null — keeps the reply identical to a wrong password, so the
    // form cannot be used to discover which emails signed up through a provider.
    if (!account.password) {
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'Account signs in through a social provider',
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
      throw new UnauthorizedException('Invalid email or password');
    }

    // A credential an administrator issued expires wherever it is presented, not just
    // on the portal it was minted for.
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
      throw new ForbiddenException(message);
    }

    if (ipAddress) {
      await this.authRepository.recordLoginIp(account.user.user_id, ipAddress);
    }

    await this.loginActivityRecorder.record({
      ...attempt,
      userId: account.user.user_id,
      outcome: 'SUCCESS',
    });

    // The session is what makes this token revocable — see `SessionGuard`.
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
      access_token: this.jwtService.sign({
        sub: account.user.user_id,
        email: account.email,
        role_type: account.user.role.type,
        sid: session.session_id,
      }),
    };
  }

  /** Ends only the calling device's session; other devices stay signed in. */
  async logout(user: JwtPayload): Promise<void> {
    if (user.sid) {
      await this.sessionRegistry.revoke(user.sid);
    }
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

  /**
   * Starts an ID-less registration session. Beneficiaries do not present a
   * school ID and do not scan a face; their details are typed in instead of
   * being read off an ID by OCR, and the email OTP is what vouches for them.
   */
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
      step: 'session_started',
      createdAt: Date.now(),
    });

    return { registrationId, step: 'session_started' };
  }

  async verifyFace(
    registrationId: string,
    selfie: Express.Multer.File,
  ): Promise<VerifyFaceResponseDto> {
    const session = await this.requireSession(registrationId);

    if (!session.idFrontImageUrl) {
      return this.captureFaceWithoutId(registrationId, session, selfie);
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

  /**
   * Face step for ID-less sessions: there is no ID photo to match against, so
   * the selfie is only checked for a usable face and enrolled as the embedding.
   */
  private async captureFaceWithoutId(
    registrationId: string,
    session: RegistrationSessionDto,
    selfie: Express.Multer.File,
  ): Promise<VerifyFaceResponseDto> {
    if (
      session.step !== 'session_started' &&
      session.step !== 'face_verified'
    ) {
      throw new BadRequestException(
        'Invalid registration step for face verification',
      );
    }

    let embedding: FrEmbedResult;
    try {
      embedding = await this.frServiceClient.embedImage(
        selfie.buffer,
        selfie.originalname,
        selfie.mimetype,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Face capture failed';
      if (this.isFaceDetectionError(detail)) {
        throw new BadRequestException(detail);
      }
      throw new BadGatewayException(
        'Face verification service is unavailable. Please try again shortly.',
      );
    }

    const selfieKey = `${registrationId}/selfie-${selfie.originalname}`;
    const selfieUrl = await this.s3Service.uploadToS3(selfieKey, selfie.buffer);

    await this.saveSession(registrationId, {
      ...session,
      selfieUrl,
      faceMatch: true,
      faceSimilarity: embedding.detScore,
      selfieEmbedding: embedding.embedding,
      step: 'face_verified',
      ocrData: null,
    });

    return {
      registrationId,
      match: true,
      similarity: embedding.detScore,
      threshold: 0,
      step: 'face_verified',
      message: 'Face captured successfully',
    };
  }

  async extractId(registrationId: string): Promise<ExtractIdResponseDto> {
    const session = await this.requireSession(registrationId);

    if (!session.idFrontImageUrl || !session.idBackImageUrl) {
      throw new BadRequestException(
        'This registration has no uploaded ID to extract details from',
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

  async registerFromSession(data: RegisterFromSessionDto) {
    const session = await this.requireSession(data.registrationId);

    await this.requireVerifiedEmail(data.account.email);

    // ID-less sessions are locked to the role that started them so an
    // ID-backed role can never be claimed without an ID.
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

    if (!isIdLess && session.step !== 'ocr_completed') {
      throw new BadRequestException(
        'OCR extraction must complete before registration',
      );
    }

    // Beneficiaries present no ID and enrol no face — their details are typed in
    // and the email OTP is what vouches for them. Every ID-backed role still needs
    // the face that was matched against the ID.
    let biometric: CreateUserDto['biometric'];
    if (!isIdLess) {
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
    }

    // A failed attempt leaves the session and the verified-email flag intact, so
    // the user can fix a detail and submit the same code again. Surface any
    // uniqueness clash before the insert so the retry gets a clear 409 rather
    // than a raw database error.
    await this.assertRegistrationDetailsAvailable({
      email: data.account.email,
      phoneNumber: data.phone_number,
      idNumber: data.school_info.id_number,
    });

    const user = await this.registerUser({
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
      school_info: data.school_info,
      biometric,
    });

    const normalizedEmail = data.account.email.trim().toLowerCase();
    await this.clearOtpState(normalizedEmail);
    await this.redisService.delete(this.registrationKey(data.registrationId));

    return user;
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

    // Every unique field is checked here, before any code goes out, so the form
    // can send the user back to the clashing input instead of the OTP screen.
    await this.assertRegistrationDetailsAvailable({
      email: normalizedEmail,
      phoneNumber: data.phone_number,
      idNumber: data.id_number,
    });

    const existingOtp = await this.redisService.get<string>(
      this.otpKey(normalizedEmail),
    );
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
        expiresInMinutes: 30,
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
      DurationUtils.THIRTY_MINUTES,
    );

    return {
      email: normalizedEmail,
      sent: true,
      reused: false,
      verified: false,
      expiresInSeconds: DurationUtils.THIRTY_MINUTES,
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

  /**
   * Step 1 of "forgot password": confirm the email belongs to an account, then mail a
   * code. The reply says an account was found — the user asked for that, and the sign-up
   * form already answers the same question, so it discloses nothing new.
   */
  async requestPasswordReset(
    email: string,
  ): Promise<ForgotPasswordResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();

    const account = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!account) {
      throw new NotFoundException('No account is registered with this email');
    }

    // A social-only account has no password to reset; sending a code would leave the
    // user staring at a form that can never sign them in.
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

    return {
      email: normalizedEmail,
      sent: true,
      reused: false,
      expiresInSeconds: DurationUtils.TEN_MINUTES,
    };
  }

  /**
   * Step 2: trade a correct code for a single-use reset token. The code is spent here,
   * so the new-password screen never has to hold on to it.
   */
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

  /** Step 3: write the new password, then sign the account out of every device. */
  async resetPassword(
    data: ResetPasswordDto,
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
    // Anyone still holding a token issued under the old password is signed out — the
    // reset is only worth something if a thief's session dies with it.
    await this.sessionRegistry.revokeAllForUser(account.user.user_id);

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

  /** Counts wrong codes for as long as the code itself lives. */
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
