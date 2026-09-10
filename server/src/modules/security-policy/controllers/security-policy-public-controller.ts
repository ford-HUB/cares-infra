import { Controller, Get } from '@nestjs/common';
import { ZSerialize } from 'nest-zod';
import { Public } from 'src/shared/decorators/public-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import type { PasswordRulesDto } from '../dto/security-policy-public-dto';
import { SecurityPolicyService } from '../services/security-policy-service';
import { PasswordRulesResponseSchema } from '../validators/security-policy-public-validator';

/**
 * Read-only, unauthenticated, and password rules only. The registration and
 * password-reset forms on both clients need to show the same rules the server will
 * enforce, and they run before a session exists.
 */
@Controller('v1/security-policy/password-rules')
export class SecurityPolicyPublicController {
  constructor(private readonly securityPolicyService: SecurityPolicyService) {}

  @Get()
  @Public()
  @ResponseMessage('Password rules')
  @ZSerialize(PasswordRulesResponseSchema)
  async getPasswordRules(): Promise<PasswordRulesDto> {
    return this.securityPolicyService.getPasswordRules();
  }
}
