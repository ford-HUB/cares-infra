import { Module } from '@nestjs/common';
import { LoginActivitySiteController } from '../controllers/login-activity-site-controller';
import { LoginActivityRepository } from '../repositories/login-activity-repository';
import { LoginActivitySiteService } from '../services/login-activity-site-service';

@Module({
  controllers: [LoginActivitySiteController],
  providers: [LoginActivitySiteService, LoginActivityRepository],
  exports: [LoginActivitySiteService, LoginActivityRepository],
})
export class LoginActivitySiteModule {}
