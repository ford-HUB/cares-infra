import { AuthRepository } from "./auth-repository";

import {
    CreateUserDto,
    ExtractIdResponseDto,
    IdOcrResultDto,
    RegisterFromSessionDto,
    RegistrationSessionDto,
    UploadIdResponseDto,
    VerifyFaceResponseDto,
} from "./auth-dto";
import { EmbeddingType } from "../../infastructures/prisma/common/client";

import {
    BadGatewayException,
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { randomUUID } from "crypto";

import * as bcrypt from "bcrypt";

import { S3Service } from "src/infastructures/s3/s3-service";

import { RedisService } from "src/infastructures/redis/redis-service";

import { FrServiceClient } from "src/infastructures/microservices/fr-service-client";

import { OcrServiceClient } from "src/infastructures/microservices/ocr-service-client";

import { UcidServiceClient } from "src/infastructures/microservices/ucid-service-client";

import { DurationUtils } from "../shared/utilities/duration-utils";



@Injectable()

export class AuthService {

    constructor(

        private readonly authRepository: AuthRepository,

        private readonly s3Service: S3Service,

        private readonly redisService: RedisService,

        private readonly frServiceClient: FrServiceClient,

        private readonly ocrServiceClient: OcrServiceClient,

        private readonly ucidServiceClient: UcidServiceClient,

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



    async uploadID(

        front: Express.Multer.File,

        back: Express.Multer.File,

    ): Promise<UploadIdResponseDto> {

        let validation;
        try {
            validation = await this.ucidServiceClient.validateId(
                front.buffer,
                front.originalname,
                back.buffer,
                back.originalname,
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



        if (session.step !== 'id_uploaded') {

            throw new BadRequestException('Invalid registration step for face verification');

        }



        const idImage = await this.loadUploadedImage(
            session.idFrontImageUrl,
            'ID photo',
        );

        let verification;
        try {
            verification = await this.frServiceClient.verifyImages(
                idImage,
                'id-front.jpg',
                selfie.buffer,
                selfie.originalname,
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

        const ocrData = await this.ocrServiceClient.extractIdFields(

            frontImage,

            'id-front.jpg',

            backImage,

            'id-back.jpg',

        );



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

}


