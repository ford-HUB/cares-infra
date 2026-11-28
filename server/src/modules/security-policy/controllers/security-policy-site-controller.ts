import { Controller, Get, Put } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
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

/** Admin-only: widening the allowlist would grant access. */
@Controller('v1/security-policy')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.SECURITY_POLICY_MANAGE)
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
