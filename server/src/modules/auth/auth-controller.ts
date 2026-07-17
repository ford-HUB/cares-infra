import { AuthService } from "./auth-service";
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from "@nestjs/common";
import { CreateUserSchema, LoginSchema, RegisterFromSessionSchema, RegistrationIdSchema, SendVerificationSchema, VerifyOtpSchema } from "./auth-validator";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { CreateUserDto, LoginDto, RegisterFromSessionDto, RegistrationIdDto, SendVerificationDto, VerifyOtpDto } from "./auth-dto";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { Public } from "src/common/decorators/public-decorator";
import { Roles } from "src/common/decorators/roles-decorator";
import { CurrentUser } from "src/common/decorators/current-user-decorator";
import { PORTAL_ROLE_TYPES } from "src/common/constants/portal-role-types";
import { JwtPayload } from "src/common/types/jwt-payload";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { RoleType } from "../../infastructures/prisma/common/client";

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @Public()
    @ResponseMessage('User created')
    async registerUser(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserDto) {
        return await this.authService.registerUser(data);
    }

    @Post('login')
    @Public()
    @HttpCode(200)
    @ResponseMessage('Login successful')
    async login(@Body(new ZodValidationPipe(LoginSchema)) data: LoginDto) {
        return await this.authService.login(data);
    }

    @Post('admin/login')
    @Public()
    @HttpCode(200)
    @ResponseMessage('Admin login successful')
    async adminLogin(@Body(new ZodValidationPipe(LoginSchema)) data: LoginDto) {
        return await this.authService.adminLogin(data);
    }

    @Get('me')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Session profile')
    async me(@CurrentUser() user: JwtPayload) {
        return await this.authService.getMe(user);
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
        @Body('roleType') roleType?: string,
    ) {
        const front = files.front?.[0];
        const back = files.back?.[0];

        if (!front || !back) {
            throw new BadRequestException('Front and back ID images are required');
        }

        const parsedRoleType =
            roleType && Object.values(RoleType).includes(roleType as RoleType)
                ? (roleType as RoleType)
                : undefined;

        return await this.authService.uploadID(front, back, parsedRoleType);
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

        return await this.authService.verifyFace(registrationResult.data.registrationId, selfie);
    }

    @Post('register-from-session')
    @Public()
    @ResponseMessage('User created')
    async registerFromSession(
        @Body(new ZodValidationPipe(RegisterFromSessionSchema)) data: RegisterFromSessionDto,
    ) {
        return await this.authService.registerFromSession(data);
    }

    @Post('extract-id')
    @Public()
    @ResponseMessage('ID fields extracted')
    async extractId(
        @Body(new ZodValidationPipe(RegistrationIdSchema)) body: RegistrationIdDto,
    ) {
        return await this.authService.extractId(body.registrationId);
    }

    @Post('send-verification')
    @Public()
    @ResponseMessage('Verification code sent')
    async sendVerification(
        @Body(new ZodValidationPipe(SendVerificationSchema)) body: SendVerificationDto,
    ) {
        return await this.authService.sendOtpEmail(body.email);
    }

    @Post('verification-status')
    @Public()
    @ResponseMessage('Verification status')
    async verificationStatus(
        @Body(new ZodValidationPipe(SendVerificationSchema)) body: SendVerificationDto,
    ) {
        return await this.authService.getVerificationStatus(body.email);
    }

    @Post('verify-otp')
    @Public()
    @ResponseMessage('Email verified')
    async verifyOtp(
        @Body(new ZodValidationPipe(VerifyOtpSchema)) body: VerifyOtpDto,
    ) {
        return await this.authService.verifyOtpEmail(body.email, body.otp);
    }
}
