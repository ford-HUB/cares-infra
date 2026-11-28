import { Module } from '@nestjs/common';
import { LoginActivityRepository } from '../repositories/login-activity-repository';
import { LoginActivityRecorder } from '../services/login-activity-recorder';
import { LoginActivitySiteModule } from './login-activity-site-module';

/** Exports the recorder for the auth flows. */
@Module({
  imports: [LoginActivitySiteModule],
  providers: [LoginActivityRepository, LoginActivityRecorder],
  exports: [LoginActivityRecorder, LoginActivityRepository],
})
export class LoginActivityModule {}
