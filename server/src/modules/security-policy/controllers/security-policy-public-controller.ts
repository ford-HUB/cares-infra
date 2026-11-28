import { Controller, Get } from '@nestjs/common';
import { ZSerialize } from 'nest-zod';
import { Public } from 'src/shared/decorators/public-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import type { PasswordRulesDto } from '../dto/security-policy-public-dto';
import { SecurityPolicyService } from '../services/security-policy-service';
import { PasswordRulesResponseSchema } from '../validators/security-policy-public-validator';

/** Public so pre-session sign-up/reset forms show the enforced rules. */
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
