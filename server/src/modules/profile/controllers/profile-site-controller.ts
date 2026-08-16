import {
  BadRequestException,
  Controller,
  Get,
  Put,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  PortalProfileDto,
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
  async getAvatar(@CurrentUser() user: JwtPayload) {
    const asset = await this.profileSiteService.getProfileAsset(
      user.sub,
      'avatar',
    );
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }

  @Get('me/signature')
  @Roles(...PORTAL_ROLE_TYPES)
  async getSignature(@CurrentUser() user: JwtPayload) {
    const asset = await this.profileSiteService.getProfileAsset(
      user.sub,
      'signature',
    );
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }
}
