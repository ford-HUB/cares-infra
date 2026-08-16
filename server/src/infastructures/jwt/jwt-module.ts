import { Global, Module } from '@nestjs/common';
import { JwtService } from './jwt-service';
import { JwtMiddleware } from './jwt-middleware';

@Global()
@Module({
  providers: [JwtService, JwtMiddleware],
  exports: [JwtService, JwtMiddleware],
})
export class JwtModule {}
