import { Controller, Get, Patch, Post } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  CertificateDeploymentDto,
  CertificateDeploymentListDto,
  DeployCertificateDto,
  UpdateDeploymentStatusDto,
} from '../dto/certificate-deployments-site-dto';
import { CertificateDeploymentsSiteService } from '../services/certificate-deployments-site-service';
import {
  CertificateDeploymentIdParamSchema,
  CertificateDeploymentListResponseSchema,
  CertificateDeploymentResponseSchema,
  DeployCertificateSchema,
  UpdateDeploymentStatusSchema,
} from '../validators/certificate-deployments-site-validator';

/**
 * The live certificates page. Coordinators running an event need to see what is going
 * out, so reading is open to the portal roles; deploying and holding a deployment are
 * the director's call.
 */
@Controller('v1/certificate-deployments')
@Roles(...PORTAL_ROLE_TYPES)
export class CertificateDeploymentsSiteController {
  constructor(
    private readonly deploymentsService: CertificateDeploymentsSiteService,
  ) {}

  @Get()
  @ResponseMessage('Deployed certificates')
  @ZSerialize(CertificateDeploymentListResponseSchema)
  async listDeployments(): Promise<CertificateDeploymentListDto> {
    return this.deploymentsService.listDeployments();
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Template deployed')
  @ZSerialize(CertificateDeploymentResponseSchema)
  async deploy(
    @CurrentUser() caller: JwtPayload,
    @ZBody(DeployCertificateSchema) data: DeployCertificateDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<CertificateDeploymentDto> {
    return this.deploymentsService.deploy(caller, data, context);
  }

  @Patch(':id/status')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Deployment updated')
  @ZSerialize(CertificateDeploymentResponseSchema)
  async updateStatus(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', CertificateDeploymentIdParamSchema) id: string,
    @ZBody(UpdateDeploymentStatusSchema) data: UpdateDeploymentStatusDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<CertificateDeploymentDto> {
    return this.deploymentsService.updateStatus(caller, id, data, context);
  }
}
