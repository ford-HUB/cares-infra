import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZParam, ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { CertificateDeploymentIdParamSchema } from '../../certificate-deployments/validators/certificate-deployments-site-validator';
import type {
  CertificateRecipientListDto,
  RemindRecipientsDto,
} from '../dto/certificates-site-dto';
import { CertificatesSiteService } from '../services/certificates-site-service';
import {
  CertificateRecipientListResponseSchema,
  RemindRecipientsResponseSchema,
} from '../validators/certificates-site-validator';

/**
 * The recipient roll behind one row on the live certificates page — who the sweep
 * has issued to and who has opened theirs.
 */
@Controller('v1/certificate-deployments')
@Roles(...PORTAL_ROLE_TYPES)
export class CertificatesSiteController {
  constructor(private readonly certificatesService: CertificatesSiteService) {}

  @Get(':id/recipients')
  @ResponseMessage('Certificate recipients')
  @ZSerialize(CertificateRecipientListResponseSchema)
  async listRecipients(
    @ZParam('id', CertificateDeploymentIdParamSchema) id: string,
  ): Promise<CertificateRecipientListDto> {
    return this.certificatesService.listRecipients(id);
  }

  /** Nudges everyone the deployment covers who has not earned their sheet yet. */
  @Post(':id/remind')
  @HttpCode(200)
  @RequirePermission(PermissionKey.CERTIFICATES_ISSUE)
  @ResponseMessage('Participants reminded')
  @ZSerialize(RemindRecipientsResponseSchema)
  async remindPending(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', CertificateDeploymentIdParamSchema) id: string,
    @RequestContext() context: RequestContextDto,
  ): Promise<RemindRecipientsDto> {
    return this.certificatesService.remindPending(caller, id, context);
  }
}
