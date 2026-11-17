import { AuthMobileService } from '../services/auth-mobile-service';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Ip,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import {
  CreateUserSchema,
  ExtractIdResponseSchema,
  ForgotPasswordResponseSchema,
  ForgotPasswordSchema,
  ResetPasswordResponseSchema,
  ResetPasswordSchema,
  VerifyResetOtpResponseSchema,
  VerifyResetOtpSchema,
  LoginResponseSchema,
  LoginSchema,
  ManualVolunteerTypeSchema,
  RegisterFromSessionSchema,
  RegisterUserResponseSchema,
  REGISTRATION_DOCUMENT_MAX_BYTES,
  RegistrationDocumentResponseSchema,
  RegistrationIdSchema,
  SendVerificationResponseSchema,
  SendVerificationSchema,
  StartSessionResponseSchema,
  StartSessionSchema,
  UploadIdResponseSchema,
  VerificationStatusResponseSchema,
  VerifyFaceResponseSchema,
  VerifyOtpResponseSchema,
  VerifyOtpSchema,
} from '../validators/auth-mobile-validator';
import type {
  CreateUserDto,
  ExtractIdResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  VerifyResetOtpDto,
  VerifyResetOtpResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterFromSessionDto,
  RegisterUserResponseDto,
  RegistrationDocumentResponseDto,
  RegistrationIdDto,
  SendVerificationDto,
  SendVerificationResponseDto,
  StartSessionDto,
  StartSessionResponseDto,
  UploadIdResponseDto,
  VerificationStatusResponseDto,
  VerifyFaceResponseDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from '../dto/auth-mobile-dto';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

@Controller('v1/auth')
export class AuthMobileController {
  constructor(private readonly authMobileService: AuthMobileService) {}

  @Post('register')
  @Public()
  @ResponseMessage('User created')
  @ZSerialize(RegisterUserResponseSchema)
  async registerUser(
    @ZBody(CreateUserSchema) data: CreateUserDto,
  ): Promise<RegisterUserResponseDto> {
    return await this.authMobileService.registerUser(data);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Login successful')
  @ZSerialize(LoginResponseSchema)
  async login(
    @ZBody(LoginSchema) data: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginResponseDto> {
    return await this.authMobileService.login(data, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Signed out')
  async logout(
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<void> {
    await this.authMobileService.logout(user, context);
  }

  @Post('start-session')
  @Public()
  @ResponseMessage('Registration session started')
  @ZSerialize(StartSessionResponseSchema)
  async startSession(
    @ZBody(StartSessionSchema) body: StartSessionDto,
  ): Promise<StartSessionResponseDto> {
    return await this.authMobileService.startSession(body.roleType);
  }

  @Post('upload-id')
  @Public()
  @ResponseMessage('ID uploaded')
  @ZSerialize(UploadIdResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]),
  )
  async uploadID(
    @UploadedFiles()
    files: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ): Promise<UploadIdResponseDto> {
    const front = files.front?.[0];
    const back = files.back?.[0];

    if (!front || !back) {
      throw new BadRequestException('Front and back ID images are required');
    }

    return await this.authMobileService.uploadID(front, back);
  }

  /**
   * An alumni ID (front and back). Not checked by the student-ID classifier or face
   * matched — the director reviews it with the registration.
   */
  @Post('upload-alumni-id')
  @Public()
  @ResponseMessage('Alumni ID uploaded')
  @ZSerialize(UploadIdResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      { limits: { fileSize: REGISTRATION_DOCUMENT_MAX_BYTES } },
    ),
  )
  async uploadAlumniID(
    @UploadedFiles()
    files: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ): Promise<UploadIdResponseDto> {
    const front = files.front?.[0];
    const back = files.back?.[0];

    if (!front || !back) {
      throw new BadRequestException(
        'Front and back alumni ID images are required',
      );
    }

    return await this.authMobileService.uploadAlumniID(front, back);
  }

  /**
   * The valid ID (front and back) of a partner-barangay volunteer. Like an alumni
   * ID it is not checked by the student-ID classifier or face matched — the
   * director reviews it with the registration.
   */
  @Post('upload-partner-barangay-id')
  @Public()
  @ResponseMessage('Partner barangay ID uploaded')
  @ZSerialize(UploadIdResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      { limits: { fileSize: REGISTRATION_DOCUMENT_MAX_BYTES } },
    ),
  )
  async uploadPartnerBarangayID(
    @UploadedFiles()
    files: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ): Promise<UploadIdResponseDto> {
    const front = files.front?.[0];
    const back = files.back?.[0];

    if (!front || !back) {
      throw new BadRequestException('Front and back ID images are required');
    }

    return await this.authMobileService.uploadPartnerBarangayID(front, back);
  }

  /**
   * The ID (front and back) of a staff or alumni volunteer who chose manual
   * registration after the app could not recognize their ID photo. It is exempt
   * from the automatic ID validation and the face scan — the director verifies
   * it by hand when reviewing the MANUAL_REGISTRATION request.
   */
  @Post('upload-manual-id')
  @Public()
  @ResponseMessage('ID uploaded for manual registration')
  @ZSerialize(UploadIdResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      { limits: { fileSize: REGISTRATION_DOCUMENT_MAX_BYTES } },
    ),
  )
  async uploadManualID(
    @Body('volunteerType') volunteerType: string,
    @UploadedFiles()
    files: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ): Promise<UploadIdResponseDto> {
    const parsedType = ManualVolunteerTypeSchema.safeParse(
      volunteerType?.trim().toUpperCase(),
    );
    if (!parsedType.success) {
      throw new BadRequestException(
        'Manual registration is only available to student, staff, alumni and partner barangay volunteers',
      );
    }

    const front = files.front?.[0];
    const back = files.back?.[0];
    if (!front || !back) {
      throw new BadRequestException('Front and back ID images are required');
    }

    return await this.authMobileService.uploadManualID(
      front,
      back,
      parsedType.data,
    );
  }

  @Post('verify-face')
  @Public()
  @ResponseMessage('Face verification complete')
  @ZSerialize(VerifyFaceResponseSchema)
  @UseInterceptors(FileInterceptor('selfie'))
  async verifyFace(
    @Body('registrationId') registrationId: string,
    @UploadedFile() selfie: Express.Multer.File,
  ): Promise<VerifyFaceResponseDto> {
    const registrationResult = RegistrationIdSchema.safeParse({
      registrationId,
    });
    if (!registrationResult.success) {
      throw new BadRequestException('Valid registrationId is required');
    }

    if (!selfie) {
      throw new BadRequestException('Selfie image is required');
    }

    return await this.authMobileService.verifyFace(
      registrationResult.data.registrationId,
      selfie,
    );
  }

  /**
   * The document on a sign-up a director reviews — a beneficiary's supporting
   * document or an alumnus's Certificate of Graduation. Multipart: `registrationId`
   * beside a `document` file of any type; it rides on the registration session until
   * `register-from-session` files it with the director's review request.
   */
  @Post('registration-document')
  @Public()
  @ResponseMessage('Document attached')
  @ZSerialize(RegistrationDocumentResponseSchema)
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: REGISTRATION_DOCUMENT_MAX_BYTES },
    }),
  )
  async uploadRegistrationDocument(
    @Body('registrationId') registrationId: string,
    @UploadedFile() document: Express.Multer.File,
  ): Promise<RegistrationDocumentResponseDto> {
    const registrationResult = RegistrationIdSchema.safeParse({
      registrationId,
    });
    if (!registrationResult.success) {
      throw new BadRequestException('Valid registrationId is required');
    }

    if (!document) {
      throw new BadRequestException('Attach a supporting document');
    }

    return await this.authMobileService.uploadRegistrationDocument(
      registrationResult.data.registrationId,
      document,
    );
  }

  @Post('register-from-session')
  @Public()
  @ResponseMessage('User created')
  @ZSerialize(RegisterUserResponseSchema)
  async registerFromSession(
    @ZBody(RegisterFromSessionSchema) data: RegisterFromSessionDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<RegisterUserResponseDto> {
    return await this.authMobileService.registerFromSession(data, context);
  }

  @Post('extract-id')
  @Public()
  @ResponseMessage('ID fields extracted')
  @ZSerialize(ExtractIdResponseSchema)
  async extractId(
    @ZBody(RegistrationIdSchema) body: RegistrationIdDto,
  ): Promise<ExtractIdResponseDto> {
    return await this.authMobileService.extractId(body.registrationId);
  }

  @Post('send-verification')
  @Public()
  @ResponseMessage('Verification code sent')
  @ZSerialize(SendVerificationResponseSchema)
  async sendVerification(
    @ZBody(SendVerificationSchema) body: SendVerificationDto,
  ): Promise<SendVerificationResponseDto> {
    return await this.authMobileService.sendOtpEmail(body);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Reset code sent')
  @ZSerialize(ForgotPasswordResponseSchema)
  async forgotPassword(
    @ZBody(ForgotPasswordSchema) body: ForgotPasswordDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ForgotPasswordResponseDto> {
    return await this.authMobileService.requestPasswordReset(
      body.email,
      context,
    );
  }

  @Post('verify-reset-otp')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Reset code verified')
  @ZSerialize(VerifyResetOtpResponseSchema)
  async verifyResetOtp(
    @ZBody(VerifyResetOtpSchema) body: VerifyResetOtpDto,
  ): Promise<VerifyResetOtpResponseDto> {
    return await this.authMobileService.verifyPasswordResetOtp(
      body.email,
      body.otp,
    );
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Password updated')
  @ZSerialize(ResetPasswordResponseSchema)
  async resetPassword(
    @ZBody(ResetPasswordSchema) body: ResetPasswordDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ResetPasswordResponseDto> {
    return await this.authMobileService.resetPassword(body, context);
  }

  @Post('verification-status')
  @Public()
  @ResponseMessage('Verification status')
  @ZSerialize(VerificationStatusResponseSchema)
  async verificationStatus(
    @ZBody(SendVerificationSchema) body: SendVerificationDto,
  ): Promise<VerificationStatusResponseDto> {
    return await this.authMobileService.getVerificationStatus(body.email);
  }

  @Post('verify-otp')
  @Public()
  @ResponseMessage('Email verified')
  @ZSerialize(VerifyOtpResponseSchema)
  async verifyOtp(
    @ZBody(VerifyOtpSchema) body: VerifyOtpDto,
  ): Promise<VerifyOtpResponseDto> {
    return await this.authMobileService.verifyOtpEmail(body.email, body.otp);
  }
}
