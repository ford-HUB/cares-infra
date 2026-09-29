import { Module } from '@nestjs/common';
import { AccessControlSiteModule } from '../../access-control/modules/access-control-site-module';
import { UsersSiteController } from '../controllers/users-site-controller';
import { UsersRepository } from '../repositories/users-repository';
import { UsersSiteService } from '../services/users-site-service';

@Module({
  // Provisioning sets an account's scope, which is the access-control repository's
  // job — the override rows are written the same way that screen writes them.
  imports: [AccessControlSiteModule],
  controllers: [UsersSiteController],
  providers: [UsersSiteService, UsersRepository],
  exports: [UsersSiteService, UsersRepository],
})
export class UsersSiteModule {}
