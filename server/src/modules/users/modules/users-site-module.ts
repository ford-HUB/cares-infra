import { Module } from '@nestjs/common';
import { UsersSiteController } from '../controllers/users-site-controller';
import { UsersRepository } from '../repositories/users-repository';
import { UsersSiteService } from '../services/users-site-service';

@Module({
  controllers: [UsersSiteController],
  providers: [UsersSiteService, UsersRepository],
  exports: [UsersSiteService, UsersRepository],
})
export class UsersSiteModule {}
