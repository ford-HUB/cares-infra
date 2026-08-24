import { Global, Module } from '@nestjs/common';
import { LoginActivityModule } from 'src/modules/login-activity/modules/login-activity-module';
import { SecurityPolicyRepository } from '../repositories/security-policy-repository';
import { LoginPolicyEnforcer } from '../services/login-policy-enforcer';
import { SecurityPolicyService } from '../services/security-policy-service';
import { SecurityPolicySiteModule } from './security-policy-site-module';

/**
 * Global for the same reason `SessionsModule` is: the policy is read far from the
 * feature that owns it — the two auth flows, the password forms, and `SessionGuard`
 * all consult it, and threading an import through each of them buys nothing.
 *
 * `LoginActivityModule` is imported here rather than by the enforcer's callers: the
 * enforcer writes its refusals to the sign-in trail.
 */
@Global()
@Module({
  imports: [SecurityPolicySiteModule, LoginActivityModule],
  providers: [
    SecurityPolicyService,
    SecurityPolicyRepository,
    LoginPolicyEnforcer,
  ],
  exports: [SecurityPolicyService, LoginPolicyEnforcer],
})
export class SecurityPolicyModule {}
