import { AuthService } from "./auth-service";
import {
    BadRequestException,
    Body,
    Controller,
    Post,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from "@nestjs/common";
import { CreateUserSchema, RegisterFromSessionSchema, RegistrationIdSchema, SendVerificationSchema, VerifyOtpSchema } from "./auth-validator";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { CreateUserDto, RegisterFromSessionDto, RegistrationIdDto, SendVerificationDto, VerifyOtpDto } from "./auth-dto";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ResponseMessage('User created')
    async registerUser(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserDto) {
        return await this.authService.registerUser(data);
    }

    @Post('upload-id')
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

        return await this.authService.uploadID(front, back);
    }

    @Post('verify-face')
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

        return await this.authService.verifyFace(registrationResult.data.registrationId, selfie);
    }

    @Post('register-from-session')
    @ResponseMessage('User created')
    async registerFromSession(
        @Body(new ZodValidationPipe(RegisterFromSessionSchema)) data: RegisterFromSessionDto,
    ) {
        return await this.authService.registerFromSession(data);
    }

    @Post('extract-id')
    @ResponseMessage('ID fields extracted')
    async extractId(
        @Body(new ZodValidationPipe(RegistrationIdSchema)) body: RegistrationIdDto,
    ) {
        return await this.authService.extractId(body.registrationId);
    }

    @Post('send-verification')
    @ResponseMessage('Verification code sent')
    async sendVerification(
        @Body(new ZodValidationPipe(SendVerificationSchema)) body: SendVerificationDto,
    ) {
        return await this.authService.sendOtpEmail(body.email);
    }

    @Post('verification-status')
    @ResponseMessage('Verification status')
    async verificationStatus(
        @Body(new ZodValidationPipe(SendVerificationSchema)) body: SendVerificationDto,
    ) {
        return await this.authService.getVerificationStatus(body.email);
    }

    @Post('verify-otp')
    @ResponseMessage('Email verified')
    async verifyOtp(
        @Body(new ZodValidationPipe(VerifyOtpSchema)) body: VerifyOtpDto,
    ) {
        return await this.authService.verifyOtpEmail(body.email, body.otp);
    }
}
