import { Module } from '@nestjs/common';
import { AuthSiteService } from '../services/auth-site-service';
import { AuthSiteController } from '../controllers/auth-site-controller';
import { AuthRepository } from '../repositories/auth-repository';
import { LoginActivityModule } from 'src/modules/login-activity/modules/login-activity-module';
import { NodemailerModule } from 'src/infastructures/nodemailer/nodemailer-module';

@Module({
  imports: [LoginActivityModule, NodemailerModule],
  controllers: [AuthSiteController],
  providers: [AuthSiteService, AuthRepository],
  exports: [AuthSiteService],
})
export class AuthSiteModule {}
