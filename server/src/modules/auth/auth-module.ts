import { Module } from '@nestjs/common';
import { AuthService } from './auth-service';
import { AuthController } from './auth-controller';
import { AuthRepository } from './auth-repository';
import { NodemailerModule } from 'src/infastructures/nodemailer/nodemailer-module';

@Module({
    imports: [NodemailerModule],
    controllers: [AuthController],
    providers: [AuthService, AuthRepository],
    exports: [AuthService],
})
export class AuthModule {}