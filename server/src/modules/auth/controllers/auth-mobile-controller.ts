import { AuthMobileService } from "../services/auth-mobile-service";
import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    Post,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from "@nestjs/common";
import {
    CreateUserSchema,
    LoginSchema,
    RegisterFromSessionSchema,
    RegistrationIdSchema,
    SendVerificationSchema,
    VerifyOtpSchema,
} from "../validators/auth-mobile-validator";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import {
    CreateUserDto,
    LoginDto,
    RegisterFromSessionDto,
    RegistrationIdDto,
    SendVerificationDto,
    VerifyOtpDto,
} from "../dto/auth-mobile-dto";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { Public } from "src/common/decorators/public-decorator";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";

@Controller('v1/auth')
export class AuthMobileController {
    constructor(private readonly authMobileService: AuthMobileService) {}

    @Post('register')
    @Public()
    @ResponseMessage('User created')
    async registerUser(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserDto) {
        return await this.authMobileService.registerUser(data);
    }

    @Post('login')
    @Public()
    @HttpCode(200)
    @ResponseMessage('Login successful')
    async login(@Body(new ZodValidationPipe(LoginSchema)) data: LoginDto) {
        return await this.authMobileService.login(data);
    }

    @Post('upload-id')
    @Public()
    @ResponseMessage('ID uploaded')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
    ]))
    async uploadID(
        @UploadedFiles() files: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
    ) {
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
    @UseInterceptors(FileInterceptor('selfie'))
    async verifyFace(
        @Body('registrationId') registrationId: string,
        @UploadedFile() selfie: Express.Multer.File,
    ) {
        const registrationResult = RegistrationIdSchema.safeParse({ registrationId });
        if (!registrationResult.success) {
            throw new BadRequestException('Valid registrationId is required');
        }

        if (!selfie) {
            throw new BadRequestException('Selfie image is required');
        }

        return await this.authMobileService.verifyFace(registrationResult.data.registrationId, selfie);
    }

    @Post('register-from-session')
    @Public()
    @ResponseMessage('User created')
    async registerFromSession(
        @Body(new ZodValidationPipe(RegisterFromSessionSchema)) data: RegisterFromSessionDto,
    ) {
        return await this.authMobileService.registerFromSession(data);
    }

    @Post('extract-id')
    @Public()
    @ResponseMessage('ID fields extracted')
    async extractId(
        @Body(new ZodValidationPipe(RegistrationIdSchema)) body: RegistrationIdDto,
    ) {
        return await this.authMobileService.extractId(body.registrationId);
    }

    @Post('send-verification')
    @Public()
    @ResponseMessage('Verification code sent')
    async sendVerification(
        @Body(new ZodValidationPipe(SendVerificationSchema)) body: SendVerificationDto,
    ) {
        return await this.authMobileService.sendOtpEmail(body.email);
    }

    @Post('verification-status')
    @Public()
    @ResponseMessage('Verification status')
    async verificationStatus(
        @Body(new ZodValidationPipe(SendVerificationSchema)) body: SendVerificationDto,
    ) {
        return await this.authMobileService.getVerificationStatus(body.email);
    }

    @Post('verify-otp')
    @Public()
    @ResponseMessage('Email verified')
    async verifyOtp(
        @Body(new ZodValidationPipe(VerifyOtpSchema)) body: VerifyOtpDto,
    ) {
        return await this.authMobileService.verifyOtpEmail(body.email, body.otp);
    }
}
