import { Global, Module } from '@nestjs/common';
import { SessionRegistry } from '../services/session-registry';
import { SessionsSiteModule } from './sessions-site-module';

/** Global: used by auth flows and `SessionGuard`. */
@Global()
@Module({
  imports: [SessionsSiteModule],
  providers: [SessionRegistry],
  exports: [SessionRegistry],
})
export class SessionsModule {}
