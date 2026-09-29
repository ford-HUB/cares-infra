import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZParam, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { MOBILE_ROLE_TYPES } from '../../../shared/constants/mobile-role-types';
import { CertificateAssetIdParamSchema } from '../../certificate-templates/validators/certificate-templates-site-validator';
import type {
  IssuedCertificateDto,
  IssuedCertificateListDto,
} from '../dto/certificates-mobile-dto';
import { CertificatesMobileService } from '../services/certificates-mobile-service';
import {
  IssuedCertificateIdParamSchema,
  IssuedCertificateListResponseSchema,
  IssuedCertificateResponseSchema,
  IssuedSignatoryIdParamSchema,
} from '../validators/certificates-mobile-validator';

/** The volunteer app's certificate wallet. */
@Controller('v1/certificates')
@Roles(...MOBILE_ROLE_TYPES)
export class CertificatesMobileController {
  constructor(
    private readonly certificatesService: CertificatesMobileService,
  ) {}

  @Get()
  @ResponseMessage('Issued certificates')
  @ZSerialize(IssuedCertificateListResponseSchema)
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<IssuedCertificateListDto> {
    return this.certificatesService.listMine(user.sub);
  }

  /** Opening a certificate is what marks it claimed on the live page. */
  @Get(':id')
  @ResponseMessage('Certificate')
  @ZSerialize(IssuedCertificateResponseSchema)
  async open(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', IssuedCertificateIdParamSchema) id: string,
  ): Promise<IssuedCertificateDto> {
    return this.certificatesService.open(user.sub, id);
  }

  @Get(':id/assets/:assetId')
  async getAsset(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', IssuedCertificateIdParamSchema) id: string,
    @ZParam('assetId', CertificateAssetIdParamSchema) assetId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const asset = await this.certificatesService.getAsset(
      user.sub,
      id,
      assetId,
    );
    return sendAsset(asset, request, response);
  }

  @Get(':id/signatories/:signatoryId/signature')
  async getSignature(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', IssuedCertificateIdParamSchema) id: string,
    @ZParam('signatoryId', IssuedSignatoryIdParamSchema) signatoryId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const asset = await this.certificatesService.getSignature(
      user.sub,
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
