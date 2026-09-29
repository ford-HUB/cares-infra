import { Module } from '@nestjs/common';
import { LoginActivityRepository } from '../repositories/login-activity-repository';
import { LoginActivityRecorder } from '../services/login-activity-recorder';
import { LoginActivitySiteModule } from './login-activity-site-module';

/**
 * Also exports the recorder: writing the trail belongs to this feature, but the
 * writes themselves happen inside the auth flows, which import this module.
 */
@Module({
  imports: [LoginActivitySiteModule],
  providers: [LoginActivityRepository, LoginActivityRecorder],
  exports: [LoginActivityRecorder, LoginActivityRepository],
})
export class LoginActivityModule {}
