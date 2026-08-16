import { Module } from '@nestjs/common';
import { AuthSiteService } from '../services/auth-site-service';
import { AuthSiteController } from '../controllers/auth-site-controller';
import { AuthRepository } from '../repositories/auth-repository';

@Module({
  controllers: [AuthSiteController],
  providers: [AuthSiteService, AuthRepository],
  exports: [AuthSiteService],
})
export class AuthSiteModule {}
