import { AuthRepository } from "./auth-repository";
import { CreateBiometricDto, CreateUserDto } from "./auth-dto";
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
    constructor(private readonly authRepository: AuthRepository) {}

    async createUser (data: CreateUserDto) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.authRepository.createUser({
            ...data,
            password: hashedPassword,
        });
    }

    async createBiometric (data: CreateBiometricDto) {
        return this.authRepository.createBiometric(data);
    }

}