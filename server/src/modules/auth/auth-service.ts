import { AuthRepository } from "./auth-repository";
import { CreateUserDto } from "./auth-dto";
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { S3Service } from "src/infastructures/s3/s3-service";
import { RedisService } from "src/infastructures/redis/redis-service";
import { DurationUtils } from "../shared/utilities/duration-utils";

@Injectable()
export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly s3Service: S3Service,
        private readonly redisService: RedisService
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

    async uploadID(file: Express.Multer.File) {
        const fileUrl = await this.s3Service.uploadToS3(file.originalname, file.buffer);
        return await this.redisService.set(file.originalname, fileUrl, DurationUtils.ONE_HOUR);
    }
}