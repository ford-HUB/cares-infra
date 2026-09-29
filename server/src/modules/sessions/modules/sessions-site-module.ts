import { Module } from '@nestjs/common';
import { SessionsSiteController } from '../controllers/sessions-site-controller';
import { SessionRepository } from '../repositories/session-repository';
import { SessionRegistry } from '../services/session-registry';
import { SessionsSiteService } from '../services/sessions-site-service';

@Module({
  controllers: [SessionsSiteController],
  providers: [SessionsSiteService, SessionRegistry, SessionRepository],
  exports: [SessionsSiteService, SessionRegistry],
})
export class SessionsSiteModule {}
