import { Controller, Get, Put } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  SecurityPolicyDto,
  UpdateSecurityPolicyDto,
} from '../dto/security-policy-site-dto';
import { SecurityPolicyService } from '../services/security-policy-service';
import {
  SecurityPolicyResponseSchema,
  UpdateSecurityPolicySchema,
} from '../validators/security-policy-site-validator';

/**
 * The policy gates who can sign in at all, so reading and changing it stays with the
 * admin role — a coordinator who could widen the allowlist could grant themselves
 * access the policy exists to deny.
 */
@Controller('v1/security-policy')
@Roles(RoleType.ADMIN)
export class SecurityPolicySiteController {
  constructor(private readonly securityPolicyService: SecurityPolicyService) {}

  @Get()
  @ResponseMessage('Security policy')
  @ZSerialize(SecurityPolicyResponseSchema)
  async getPolicy(): Promise<SecurityPolicyDto> {
    return this.securityPolicyService.getPolicyDetail();
  }

  @Put()
  @ResponseMessage('Security policy updated')
  @ZSerialize(SecurityPolicyResponseSchema)
  async updatePolicy(
    @CurrentUser() user: JwtPayload,
    @ZBody(UpdateSecurityPolicySchema) data: UpdateSecurityPolicyDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<SecurityPolicyDto> {
    return this.securityPolicyService.updatePolicy(data, user, context);
  }
}
