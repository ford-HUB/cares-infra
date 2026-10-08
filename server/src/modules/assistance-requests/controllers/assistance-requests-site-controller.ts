import { Controller, Get, Post, StreamableFile } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  ApproveAssistanceRequestDto,
  DeclineAssistanceRequestDto,
  SiteAssistanceRequestDto,
  SiteAssistanceRequestListDto,
} from '../dto/assistance-requests-site-dto';
import { AssistanceRequestsSiteService } from '../services/assistance-requests-site-service';
import {
  ApproveAssistanceRequestSchema,
  AssistanceAttachmentIdParamSchema,
  AssistanceRequestIdParamSchema,
  DeclineAssistanceRequestSchema,
  SiteAssistanceRequestListResponseSchema,
  SiteAssistanceRequestSchema,
} from '../validators/assistance-requests-site-validator';

/**
 * Beneficiaries' assistance requests, reviewed under Users → Request in the
 * portal, so it follows that page's gate. The app's own routes live under
 * `me`, which the uuid params here never match.
 */
@Controller('v1/assistance-requests')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.USERS_VIEW)
export class AssistanceRequestsSiteController {
  constructor(
    private readonly assistanceRequestsSiteService: AssistanceRequestsSiteService,
  ) {}

  @Get()
  @ResponseMessage('Assistance requests')
  @ZSerialize(SiteAssistanceRequestListResponseSchema)
  async list(): Promise<SiteAssistanceRequestListDto> {
    return this.assistanceRequestsSiteService.list();
  }

  /** Proof documents are private in S3, so the portal streams them here. */
  @Get(':id/attachments/:attachmentId')
  async getAttachment(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
    @ZParam('attachmentId', AssistanceAttachmentIdParamSchema)
    attachmentId: string,
  ) {
    const asset = await this.assistanceRequestsSiteService.getAttachment(
      id,
      attachmentId,
    );
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }

  @Post(':id/review')
  @ResponseMessage('Request moved to review')
  @ZSerialize(SiteAssistanceRequestSchema)
  async review(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
  ): Promise<SiteAssistanceRequestDto> {
    return this.assistanceRequestsSiteService.review(id);
  }

  @Post(':id/approve')
  @ResponseMessage('Request approved')
  @ZSerialize(SiteAssistanceRequestSchema)
  async approve(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
    @ZBody(ApproveAssistanceRequestSchema) body: ApproveAssistanceRequestDto,
  ): Promise<SiteAssistanceRequestDto> {
    return this.assistanceRequestsSiteService.approve(id, body);
  }

  @Post(':id/decline')
  @ResponseMessage('Request declined')
  @ZSerialize(SiteAssistanceRequestSchema)
  async decline(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
    @ZBody(DeclineAssistanceRequestSchema) body: DeclineAssistanceRequestDto,
  ): Promise<SiteAssistanceRequestDto> {
    return this.assistanceRequestsSiteService.decline(id, body);
  }

  @Post(':id/complete')
  @ResponseMessage('Assistance marked as released')
  @ZSerialize(SiteAssistanceRequestSchema)
  async complete(
    @ZParam('id', AssistanceRequestIdParamSchema) id: string,
  ): Promise<SiteAssistanceRequestDto> {
    return this.assistanceRequestsSiteService.complete(id);
  }
}
