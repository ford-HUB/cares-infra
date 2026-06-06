import { AuthService } from "./auth-service";
import { Body, Controller, Post, UseInterceptors, UploadedFile } from "@nestjs/common";
import { CreateUserSchema } from "./auth-validator";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { CreateUserDto } from "./auth-dto";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { S3Service } from "src/infastructures/s3/s3-service";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller('v1/auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService, 
        private readonly s3Service: S3Service
    ) {}

    @Post('register')
    @ResponseMessage('User created')
    async registerUser(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserDto) {
        return await this.authService.registerUser(data);
    }

    @Post('upload-id')
    @ResponseMessage('ID uploaded')
    @UseInterceptors(FileInterceptor('file'))
    async uploadID(@UploadedFile() file: Express.Multer.File) {
        return await this.authService.uploadID(file);
    }
}