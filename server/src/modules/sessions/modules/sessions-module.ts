import { Global, Module } from '@nestjs/common';
import { SessionRegistry } from '../services/session-registry';
import { SessionsSiteModule } from './sessions-site-module';

/**
 * Global because the registry has two callers outside this feature: the auth flows,
 * which open a session on sign-in, and `SessionGuard`, which checks every request
 * against it.
 */
@Global()
@Module({
  imports: [SessionsSiteModule],
  providers: [SessionRegistry],
  exports: [SessionRegistry],
})
export class SessionsModule {}
