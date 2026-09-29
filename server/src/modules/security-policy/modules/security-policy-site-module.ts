import { Module } from '@nestjs/common';
import { SecurityPolicySiteController } from '../controllers/security-policy-site-controller';
import { SecurityPolicyRepository } from '../repositories/security-policy-repository';
import { SecurityPolicyService } from '../services/security-policy-service';

@Module({
  controllers: [SecurityPolicySiteController],
  providers: [SecurityPolicyService, SecurityPolicyRepository],
  exports: [SecurityPolicyService],
})
export class SecurityPolicySiteModule {}
