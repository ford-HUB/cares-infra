import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Put,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  PortalProfileDto,
  ProfileAssetKind,
  UpdatePortalProfileDto,
} from '../dto/profile-site-dto';
import { ProfileSiteService } from '../services/profile-site-service';
import {
  PortalProfileResponseSchema,
  UpdatePortalProfileSchema,
} from '../validators/profile-site-validator';

@Controller('v1/profile')
export class ProfileSiteController {
  constructor(private readonly profileSiteService: ProfileSiteService) {}

  @Get('me')
  @Roles(...PORTAL_ROLE_TYPES)
  @ResponseMessage('Portal profile')
  @ZSerialize(PortalProfileResponseSchema)
  async getMyProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<PortalProfileDto> {
    return this.profileSiteService.getMyProfile(user.sub);
  }

  @Put('me')
  @Roles(...PORTAL_ROLE_TYPES)
  @ResponseMessage('Profile updated')
  @ZSerialize(PortalProfileResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
    ]),
  )
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @ZBody(UpdatePortalProfileSchema) data: UpdatePortalProfileDto,
    @UploadedFiles()
    files?: {
      avatar?: Express.Multer.File[];
      signature?: Express.Multer.File[];
    },
  ): Promise<PortalProfileDto> {
    const avatar = files?.avatar?.[0];
    const signature = files?.signature?.[0];

    if (avatar && !avatar.buffer?.length) {
      throw new BadRequestException('Avatar file is empty');
    }
    if (signature && !signature.buffer?.length) {
      throw new BadRequestException('Signature file is empty');
    }

    return this.profileSiteService.updateMyProfile(user.sub, data, {
      avatar,
      signature,
    });
  }

  @Get('me/avatar')
  @Roles(...PORTAL_ROLE_TYPES)
  async getAvatar(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sendProfileAsset(user.sub, 'avatar', request, response);
  }

  @Get('me/signature')
  @Roles(...PORTAL_ROLE_TYPES)
  async getSignature(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sendProfileAsset(user.sub, 'signature', request, response);
  }

  /**
   * Assets are private but revalidatable: `no-cache` makes the browser ask every time,
   * and the content-hash ETag lets it answer 304 without re-sending the image. That is
   * what stops the navbar avatar re-downloading on every portal refresh — Redis only
   * removes the S3 round-trip behind it.
   */
  private async sendProfileAsset(
    userId: string,
    kind: ProfileAssetKind,
    request: Request,
    response: Response,
  ): Promise<StreamableFile | undefined> {
    const asset = await this.profileSiteService.getProfileAsset(userId, kind);

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
}
