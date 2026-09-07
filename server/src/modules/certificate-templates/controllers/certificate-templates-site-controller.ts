import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
  CertificateTemplateDto,
  CertificateTemplateListDto,
  CreateCertificateTemplateDto,
  DeleteCertificateTemplateDto,
  SaveCertificateTemplateDto,
  SignatoryCoordinatorListDto,
} from '../dto/certificate-templates-site-dto';
import { CertificateTemplatesSiteService } from '../services/certificate-templates-site-service';
import {
  CertificateAssetIdParamSchema,
  CertificateTemplateIdParamSchema,
  CertificateTemplateListResponseSchema,
  CertificateTemplateResponseSchema,
  CreateCertificateTemplateSchema,
  DeleteCertificateTemplateResponseSchema,
  SaveCertificateTemplateSchema,
  SignatoryCoordinatorListResponseSchema,
} from '../validators/certificate-templates-site-validator';

/**
 * Reading a template is open to the portal roles — a coordinator running an event has
 * to see what will be printed — but the designs themselves are the director's to
 * change, so every write narrows to director and admin.
 */
@Controller('v1/certificate-templates')
@Roles(...PORTAL_ROLE_TYPES)
export class CertificateTemplatesSiteController {
  constructor(
    private readonly certificateTemplatesService: CertificateTemplatesSiteService,
  ) {}

  @Get()
  @ResponseMessage('Certificate templates')
  @ZSerialize(CertificateTemplateListResponseSchema)
  async listTemplates(): Promise<CertificateTemplateListDto> {
    return this.certificateTemplatesService.listTemplates();
  }

  /**
   * The accounts the signatory picker offers. Declared before `:id` so the literal
   * segment is not read as a template id.
   */
  @Get('signatories')
  @ResponseMessage('Signatory accounts')
  @ZSerialize(SignatoryCoordinatorListResponseSchema)
  async listSignatories(): Promise<SignatoryCoordinatorListDto> {
    return this.certificateTemplatesService.listCoordinators();
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Certificate template created')
  @ZSerialize(CertificateTemplateResponseSchema)
  async createTemplate(
    @CurrentUser() caller: JwtPayload,
    @ZBody(CreateCertificateTemplateSchema) data: CreateCertificateTemplateDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<CertificateTemplateDto> {
    return this.certificateTemplatesService.createTemplate(
      caller,
      data,
      context,
    );
  }

  /**
   * The customizer submits the whole template — details, design and signature lines —
   * because it edits them as one sheet: a partial update would let the wording and the
   * people signing it drift out of step.
   */
  @Put(':id')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Certificate template saved')
  @ZSerialize(CertificateTemplateResponseSchema)
  async saveTemplate(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', CertificateTemplateIdParamSchema) id: string,
    @ZBody(SaveCertificateTemplateSchema) data: SaveCertificateTemplateDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<CertificateTemplateDto> {
    return this.certificateTemplatesService.saveTemplate(
      caller,
      id,
      data,
      context,
    );
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Certificate template deleted')
  @ZSerialize(DeleteCertificateTemplateResponseSchema)
  async deleteTemplate(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', CertificateTemplateIdParamSchema) id: string,
    @RequestContext() context: RequestContextDto,
  ): Promise<DeleteCertificateTemplateDto> {
    return this.certificateTemplatesService.deleteTemplate(caller, id, context);
  }

  /** Imported artwork lives in a private bucket; the portal reads bytes through here. */
  @Get(':id/assets/:assetId')
  async getAsset(
    @ZParam('id', CertificateTemplateIdParamSchema) id: string,
    @ZParam('assetId', CertificateAssetIdParamSchema) assetId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const asset = await this.certificateTemplatesService.getAsset(id, assetId);
    return sendAsset(asset, request, response);
  }

  /**
   * What `{{signature-image}}` resolves to for one signature line — the coordinator's
   * own signature image. Not called by the customizer, which shows the account rather
   * than the picture; it is here for whatever renders the finished certificate.
   */
  @Get(':id/signatories/:signatoryId/signature')
  async getSignatorySignature(
    @ZParam('id', CertificateTemplateIdParamSchema) id: string,
    @ZParam('signatoryId', CertificateTemplateIdParamSchema)
    signatoryId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const asset = await this.certificateTemplatesService.getSignatorySignature(
      id,
      signatoryId,
    );
    return sendAsset(asset, request, response);
  }
}

function sendAsset(
  asset: { buffer: Buffer; contentType: string; etag: string },
  request: Request,
  response: Response,
): StreamableFile | undefined {
  response.setHeader('ETag', asset.etag);
  response.setHeader('Cache-Control', 'private, no-cache');

  if (request.headers['if-none-match'] === asset.etag) {
    response.status(HttpStatus.NOT_MODIFIED);
    return undefined;
  }

  return new StreamableFile(asset.buffer, {
    type: asset.contentType,
    disposition: 'inline',
  });
}
