import { Module } from '@nestjs/common';
import { AuthMobileService } from '../services/auth-mobile-service';
import { AuthMobileController } from '../controllers/auth-mobile-controller';
import { AuthRepository } from '../repositories/auth-repository';
import { NodemailerModule } from 'src/infastructures/nodemailer/nodemailer-module';

@Module({
  imports: [NodemailerModule],
  controllers: [AuthMobileController],
  providers: [AuthMobileService, AuthRepository],
  exports: [AuthMobileService],
})
export class AuthMobileModule {}
