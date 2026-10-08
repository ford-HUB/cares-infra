import { Module } from '@nestjs/common';
import { AuthMobileService } from '../services/auth-mobile-service';
import { AuthMobileController } from '../controllers/auth-mobile-controller';
import { AuthRepository } from '../repositories/auth-repository';
import { NodemailerModule } from 'src/infastructures/nodemailer/nodemailer-module';
import { LoginActivityModule } from 'src/modules/login-activity/modules/login-activity-module';
import { AccessControlSiteModule } from 'src/modules/access-control/modules/access-control-site-module';

@Module({
  imports: [NodemailerModule, LoginActivityModule, AccessControlSiteModule],
  controllers: [AuthMobileController],
  providers: [AuthMobileService, AuthRepository],
  exports: [AuthMobileService],
})
export class AuthMobileModule {}
