import { AuthService } from "./auth-service";
import { Body, Controller, Post } from "@nestjs/common";
import { CreateBiometricSchema, CreateUserSchema } from "./auth-validator";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { CreateUserDto, CreateBiometricDto } from "./auth-dto";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ResponseMessage('User created')
    async createUser(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserDto) {
        return await this.authService.createUser(data);
    }

    @Post('register/biometric')
    @ResponseMessage('Biometric created')
    async createBiometric(@Body(new ZodValidationPipe(CreateBiometricSchema)) data: CreateBiometricDto) {
        return await this.authService.createBiometric(data);
    }
}