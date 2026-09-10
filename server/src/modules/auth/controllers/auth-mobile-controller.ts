import { AuthMobileService } from '../services/auth-mobile-service';
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
  LoginResponseSchema,
  LoginSchema,
  RegisterFromSessionSchema,
  RegisterUserResponseSchema,
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
  LoginDto,
  LoginResponseDto,
  RegisterFromSessionDto,
  RegisterUserResponseDto,
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
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authMobileService.logout(user);
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

  @Post('register-from-session')
  @Public()
  @ResponseMessage('User created')
  @ZSerialize(RegisterUserResponseSchema)
  async registerFromSession(
    @ZBody(RegisterFromSessionSchema) data: RegisterFromSessionDto,
  ): Promise<RegisterUserResponseDto> {
    return await this.authMobileService.registerFromSession(data);
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
    return await this.authMobileService.sendOtpEmail(body.email);
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
