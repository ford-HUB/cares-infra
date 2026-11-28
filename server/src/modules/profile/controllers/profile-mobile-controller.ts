import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ZBody, ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ApplySchoolRecordDto,
  MobileProfileDto,
  MobileProfileRoleQueryDto,
  UpdateMobileProfileDto,
} from '../dto/profile-mobile-dto';
import { ProfileMobileService } from '../services/profile-mobile-service';
import {
  MOBILE_PROFILE_ACCESS_ROLE_TYPES,
  ApplySchoolRecordSchema,
  MobileProfileResponseSchema,
  MobileProfileRoleQuerySchema,
  UpdateMobileProfileSchema,
} from '../validators/profile-mobile-validator';

/** Routes under `me/mobile` to avoid clashing with the site controller. */
@Controller('v1/profile')
export class ProfileMobileController {
  constructor(private readonly profileMobileService: ProfileMobileService) {}

  /** `?role=` scopes completion and the role section to the open dashboard. */
  @Get('me/mobile')
  @Roles(...MOBILE_PROFILE_ACCESS_ROLE_TYPES)
  @ResponseMessage('Profile')
  @ZSerialize(MobileProfileResponseSchema)
  async getMyProfile(
    @CurrentUser() user: JwtPayload,
    @ZQuery(MobileProfileRoleQuerySchema) query: MobileProfileRoleQueryDto,
  ): Promise<MobileProfileDto> {
    return this.profileMobileService.getMyProfile(user.sub, query.role);
  }

  /** Multipart for the optional `avatar`; full replace, not a patch. */
  @Put('me/mobile')
  @Roles(...MOBILE_PROFILE_ACCESS_ROLE_TYPES)
  @ResponseMessage('Profile updated')
  @ZSerialize(MobileProfileResponseSchema)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'avatar', maxCount: 1 }]))
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @ZBody(UpdateMobileProfileSchema) data: UpdateMobileProfileDto,
    @ZQuery(MobileProfileRoleQuerySchema) query: MobileProfileRoleQueryDto,
    @RequestContext() context: RequestContextDto,
    @UploadedFiles() files?: { avatar?: Express.Multer.File[] },
  ): Promise<MobileProfileDto> {
    const avatar = files?.avatar?.[0];
    if (avatar && !avatar.buffer?.length) {
      throw new BadRequestException('Avatar file is empty');
    }

    return this.profileMobileService.updateMyProfile(
      user.sub,
      data,
      avatar,
      query.role,
      { actor: user, context },
    );
  }

  /** Rewritten from OCR via the registration ID session (`upload-id` → `verify-face` → `extract-id`); no typed department. */
  @Post('me/mobile/school-record')
  @Roles(RoleType.VOLUNTEER, RoleType.BENEFICIARY)
  @ResponseMessage('School record updated')
  @ZSerialize(MobileProfileResponseSchema)
  async applySchoolRecord(
    @CurrentUser() user: JwtPayload,
    @ZBody(ApplySchoolRecordSchema) data: ApplySchoolRecordDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<MobileProfileDto> {
    return this.profileMobileService.applySchoolRecordFromSession(
      user.sub,
      data.registrationId,
      { actor: user, context },
    );
  }

  /** Address comes from OCR of a proof of residency; nothing typed. */
  @Post('me/mobile/residency')
  @Roles(...MOBILE_PROFILE_ACCESS_ROLE_TYPES)
  @ResponseMessage('Address updated from your residency document')
  @ZSerialize(MobileProfileResponseSchema)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'document', maxCount: 1 }]))
  async applyResidencyDocument(
    @CurrentUser() user: JwtPayload,
    @ZQuery(MobileProfileRoleQuerySchema) query: MobileProfileRoleQueryDto,
    @RequestContext() context: RequestContextDto,
    @UploadedFiles() files?: { document?: Express.Multer.File[] },
  ): Promise<MobileProfileDto> {
    const document = files?.document?.[0];
    if (!document || !document.buffer?.length) {
      throw new BadRequestException('Attach your residency document');
    }

    return this.profileMobileService.applyResidencyDocument(
      user.sub,
      document,
      query.role,
      { actor: user, context },
    );
  }

  /** Private to its owner. */
  @Get('me/mobile/residency/:documentId')
  @Roles(...MOBILE_PROFILE_ACCESS_ROLE_TYPES)
  async getResidencyDocument(
    @CurrentUser() user: JwtPayload,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const doc = await this.profileMobileService.getResidencyDocument(
      user.sub,
      documentId,
    );
    response.setHeader('Cache-Control', 'private, no-cache');
    return new StreamableFile(doc.buffer, {
      type: doc.contentType,
      disposition: `inline; filename="${doc.fileName.replace(/"/g, '')}"`,
    });
  }

  /** Per-role photo (`?role=`, default registered role); ETag-revalidated. */
  @Get('me/mobile/avatar')
  @Roles(...MOBILE_PROFILE_ACCESS_ROLE_TYPES)
  async getAvatar(
    @CurrentUser() user: JwtPayload,
    @ZQuery(MobileProfileRoleQuerySchema) query: MobileProfileRoleQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const asset = await this.profileMobileService.getRoleAvatar(
      user.sub,
      query.role,
    );

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
