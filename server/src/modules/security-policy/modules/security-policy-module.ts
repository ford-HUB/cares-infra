import { Global, Module } from '@nestjs/common';
import { LoginActivityModule } from 'src/modules/login-activity/modules/login-activity-module';
import { SecurityPolicyRepository } from '../repositories/security-policy-repository';
import { LoginPolicyEnforcer } from '../services/login-policy-enforcer';
import { SecurityPolicyService } from '../services/security-policy-service';
import { SecurityPolicyPublicModule } from './security-policy-public-module';
import { SecurityPolicySiteModule } from './security-policy-site-module';

/** Global: read by both auth flows, password forms and `SessionGuard`. Imports `LoginActivityModule` for refusals. */
@Global()
@Module({
  imports: [
    SecurityPolicySiteModule,
    SecurityPolicyPublicModule,
    LoginActivityModule,
  ],
  providers: [
    SecurityPolicyService,
    SecurityPolicyRepository,
    LoginPolicyEnforcer,
  ],
  exports: [SecurityPolicyService, LoginPolicyEnforcer],
})
export class SecurityPolicyModule {}
