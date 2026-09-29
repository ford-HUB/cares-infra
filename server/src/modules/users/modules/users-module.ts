import { Module } from '@nestjs/common';
import { UsersSiteModule } from './users-site-module';

@Module({
  imports: [UsersSiteModule],
})
export class UsersModule {}
