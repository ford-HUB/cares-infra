import { AuthRepository } from "./auth-repository";

import {
    CreateUserDto,
    ExtractIdResponseDto,
    IdOcrResultDto,
    LoginDto,
    LoginResponseDto,
    AdminLoginResponseDto,
    MeResponseDto,
    RegisterFromSessionDto,
    RegistrationSessionDto,
    UploadIdResponseDto,
    VerifyFaceResponseDto,
} from "./auth-dto";
import { EmbeddingType, RoleType } from "../../infastructures/prisma/common/client";

import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";

import { randomInt, randomUUID } from "crypto";

import * as bcrypt from "bcrypt";

import { S3Service } from "src/infastructures/s3/s3-service";

import { RedisService } from "src/infastructures/redis/redis-service";

import { FrServiceClient } from "src/infastructures/microservices/fr-service-client";

import { OcrServiceClient } from "src/infastructures/microservices/ocr-service-client";

import { UcidServiceClient } from "src/infastructures/microservices/ucid-service-client";

import { DurationUtils } from "../../shared/utilities/duration-utils";

import { TemplateUtils } from "src/shared/utilities/templete-utils";
import { NodemailerService } from "src/infastructures/nodemailer/nodemailer-service";
import { JwtService } from "src/infastructures/jwt/jwt-service";
import { JwtPayload } from "src/common/types/jwt-payload";
import { isPortalRole } from "src/common/constants/portal-role-types";



@Injectable()

export class AuthService {

    constructor(

        private readonly authRepository: AuthRepository,

        private readonly s3Service: S3Service,

        private readonly redisService: RedisService,

        private readonly frServiceClient: FrServiceClient,

        private readonly ocrServiceClient: OcrServiceClient,

        private readonly ucidServiceClient: UcidServiceClient,

        private readonly nodemailerService: NodemailerService,

        private readonly jwtService: JwtService,

    ) {}



    async registerUser (data: CreateUserDto) {

        const hashedPassword = await bcrypt.hash(data.account.password, 10);

        return this.authRepository.createUser({

            ...data,

            account: {

                ...data.account,

                password: hashedPassword,

            },

        });

    }

    async login(data: LoginDto): Promise<LoginResponseDto> {
        const email = data.email.trim().toLowerCase();
        const account = await this.authRepository.findAccountForLogin(email);
        if (!account) {
            throw new UnauthorizedException("Invalid email or password");
        }

        let passwordMatches = false;
        try {
            passwordMatches = await bcrypt.compare(data.password, account.password);
        } catch {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!passwordMatches) {
            throw new UnauthorizedException("Invalid email or password");
        }

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
            }),
        };
    }

    async adminLogin(data: LoginDto): Promise<AdminLoginResponseDto> {
        const email = data.email.trim().toLowerCase();
        const account = await this.authRepository.findAccountForLogin(email);
        if (!account) {
            throw new UnauthorizedException("Invalid email or password");
        }

        let passwordMatches = false;
        try {
            passwordMatches = await bcrypt.compare(data.password, account.password);
        } catch {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!passwordMatches) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!isPortalRole(account.user.role.type)) {
            throw new ForbiddenException("This portal is for administrators only");
        }

        return {
            user_id: account.user.user_id,
            role_type: account.user.role.type,
            email: account.email,
            firstname: account.user.firstname,
            lastname: account.user.lastname,
            has_interests: account.user.user_interest !== null,
            access_token: this.jwtService.sign({
                sub: account.user.user_id,
                email: account.email,
                role_type: account.user.role.type,
            }),
        };
    }

    async getMe(user: JwtPayload): Promise<MeResponseDto> {
        const profile = await this.authRepository.findUserProfile(user.sub);
        if (!profile) {
            throw new UnauthorizedException("User not found");
        }

        const email = profile.accounts[0]?.email ?? user.email;

        return {
            user_id: profile.user_id,
            email,
            firstname: profile.firstname,
            lastname: profile.lastname,
            role_type: profile.role.type,
        };
    }



    async uploadID(

        front: Express.Multer.File,

        back: Express.Multer.File,

    ): Promise<UploadIdResponseDto> {

        let validation : any;
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
            const detail = error instanceof Error ? error.message : 'ID validation failed';
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



        const idFrontImageUrl = await this.s3Service.uploadToS3(frontKey, front.buffer);

        const idBackImageUrl = await this.s3Service.uploadToS3(backKey, back.buffer);



        await this.saveSession(registrationId, {

            idFrontImageUrl,

            idBackImageUrl,

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



    async verifyFace(

        registrationId: string,

        selfie: Express.Multer.File,

    ): Promise<VerifyFaceResponseDto> {

        const session = await this.requireSession(registrationId);

        const canVerifyFace =
            session.step === 'id_uploaded' ||
            session.step === 'face_verified' ||
            session.step === 'ocr_completed';

        if (!canVerifyFace) {
            throw new BadRequestException('Invalid registration step for face verification');
        }



        const idImage = await this.loadUploadedImage(
            session.idFrontImageUrl,
            'ID photo',
        );

        let verification : any;
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
            const detail = error instanceof Error ? error.message : 'Face verification failed';
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



    async extractId(registrationId: string): Promise<ExtractIdResponseDto> {

        const session = await this.requireSession(registrationId);



        if (session.step !== 'face_verified' || !session.faceMatch) {

            throw new BadRequestException('Face verification must complete before OCR extraction');

        }



        const frontImage = await this.loadUploadedImage(session.idFrontImageUrl, 'ID front photo');

        const backImage = await this.loadUploadedImage(session.idBackImageUrl, 'ID back photo');

        let ocrData: IdOcrResultDto;
        try {
            ocrData = await this.ocrServiceClient.extractIdFields(
                frontImage,
                'id-front.jpg',
                backImage,
                'id-back.jpg',
            );
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'OCR extraction failed';
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

        if (session.step !== 'ocr_completed') {
            throw new BadRequestException('OCR extraction must complete before registration');
        }

        if (!session.faceMatch || !session.selfieUrl || !session.selfieEmbedding) {
            throw new BadRequestException('Face verification data is missing from registration session');
        }

        const faceUrl = this.s3Service.buildObjectUrl(
            this.s3Service.resolveObjectKey(session.selfieUrl),
        );

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
            biometric: {
                face_url: faceUrl,
                embedding: session.selfieEmbedding,
                embedding_type: EmbeddingType.FACE,
                isActive: true,
            },
        });

        const normalizedEmail = data.account.email.trim().toLowerCase();
        await this.clearOtpState(normalizedEmail);
        await this.redisService.delete(this.registrationKey(data.registrationId));

        return user;
    }

    async getRegistrationSession(registrationId: string): Promise<RegistrationSessionDto | null> {

        return this.redisService.get<RegistrationSessionDto>(this.registrationKey(registrationId));

    }



    private async requireSession(registrationId: string): Promise<RegistrationSessionDto> {

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



    private async loadUploadedImage(storedKeyOrUrl: string, label: string): Promise<Buffer> {
        try {
            return await this.s3Service.getObjectBuffer(storedKeyOrUrl);
        } catch {
            throw new BadRequestException(
                `Unable to load your ${label}. Please go back and upload a clear ID image again.`,
            );
        }
    }

    private buildFaceMismatchMessage(similarity: number, threshold: number): string {
        const matchPct = Math.round(similarity * 100);
        const requiredPct = Math.round(threshold * 100);
        return `Your selfie does not match the face on your ID (${matchPct}% match, ${requiredPct}% required). Adjust lighting, face the camera directly, and try again.`;
    }

    private isFaceDetectionError(message: string): boolean {
        const normalized = message.toLowerCase();
        return normalized.includes('face') ||
            normalized.includes('detect') ||
            normalized.includes('image');
    }



    private registrationKey(registrationId: string): string {

        return `registration:${registrationId}`;

    }

    async sendOtpEmail(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        const existingAccount = await this.authRepository.findUserByEmail(normalizedEmail);
        if (existingAccount) {
            throw new ConflictException('An account with this email already exists');
        }

        const existingOtp = await this.redisService.get<string>(this.otpKey(normalizedEmail));
        if (existingOtp) {
            const expiresInSeconds = await this.redisService.ttl(this.otpKey(normalizedEmail));
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
        const template = await TemplateUtils.compileTemplate('otp-verification.html', {
            code: otp,
            username: normalizedEmail,
            expiresInMinutes: 30,
        });

        try {
            await this.nodemailerService.sendEmail(normalizedEmail, 'OTP Verification', template);
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Email delivery failed';
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
        const expiresInSeconds = await this.redisService.ttl(this.otpKey(normalizedEmail));
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
        const storedOtp = await this.redisService.get<string>(this.otpKey(normalizedEmail));

        if (!storedOtp) {
            throw new BadRequestException('Verification code expired or not found. Please request a new code.');
        }

        if (storedOtp !== otp) {
            throw new BadRequestException('Invalid verification code');
        }

        await this.redisService.set(
            this.otpVerifiedKey(normalizedEmail),
            'true',
            DurationUtils.THIRTY_MINUTES,
        );

        const expiresInSeconds = await this.redisService.ttl(this.otpKey(normalizedEmail));

        return {
            email: normalizedEmail,
            verified: true,
            expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : 0,
        };
    }

    private otpKey(email: string): string {
        return `otp:${email}`;
    }

    private otpVerifiedKey(email: string): string {
        return `otp-verified:${email}`;
    }

    private async isEmailVerified(email: string): Promise<boolean> {
        const verified = await this.redisService.get<string>(this.otpVerifiedKey(email));
        return verified === 'true';
    }

    private async clearOtpState(email: string): Promise<void> {
        await this.redisService.delete(this.otpKey(email));
        await this.redisService.delete(this.otpVerifiedKey(email));
    }

    private async requireVerifiedEmail(email: string): Promise<void> {
        const normalizedEmail = email.trim().toLowerCase();
        const verified = await this.isEmailVerified(normalizedEmail);

        if (!verified) {
            throw new BadRequestException('Email verification is required before registration');
        }
    }
}


