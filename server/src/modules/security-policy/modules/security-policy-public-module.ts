import { Module } from '@nestjs/common';
import { SecurityPolicyPublicController } from '../controllers/security-policy-public-controller';
import { SecurityPolicyRepository } from '../repositories/security-policy-repository';
import { SecurityPolicyService } from '../services/security-policy-service';

@Module({
  controllers: [SecurityPolicyPublicController],
  providers: [SecurityPolicyService, SecurityPolicyRepository],
  exports: [SecurityPolicyService],
})
export class SecurityPolicyPublicModule {}
