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
  MOBILE_PROFILE_ROLE_TYPES,
  ApplySchoolRecordSchema,
  MobileProfileResponseSchema,
  MobileProfileRoleQuerySchema,
  UpdateMobileProfileSchema,
} from '../validators/profile-mobile-validator';

/**
 * Profile for the Flutter app. Shares the `v1/profile` path with the portal
 * controller; the routes differ (`me/mobile`) so the two never collide.
 */
@Controller('v1/profile')
export class ProfileMobileController {
  constructor(private readonly profileMobileService: ProfileMobileService) {}

  /**
   * `?role=` names the dashboard the app has open (the role switcher is
   * local), so completion and the role section are scoped to that side.
   */
  @Get('me/mobile')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
  @ResponseMessage('Profile')
  @ZSerialize(MobileProfileResponseSchema)
  async getMyProfile(
    @CurrentUser() user: JwtPayload,
    @ZQuery(MobileProfileRoleQuerySchema) query: MobileProfileRoleQueryDto,
  ): Promise<MobileProfileDto> {
    return this.profileMobileService.getMyProfile(user.sub, query.role);
  }

  /**
   * Multipart so the optional `avatar` file travels with the fields; the app
   * sends every field each time (a full replace, not a patch).
   */
  @Put('me/mobile')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
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

  /**
   * Department can't be typed in: the app re-runs the registration ID steps
   * (`/auth/upload-id` → `/auth/verify-face` → `/auth/extract-id`) and hands
   * the finished session here, and the school record is rewritten from OCR.
   */
  @Post('me/mobile/school-record')
  @Roles(RoleType.VOLUNTEER)
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

  /**
   * Address changes go through a proof of residency: the app uploads a
   * barangay certificate (photo or PDF), the OCR service reads the address off
   * it, and the file is kept on record. Nothing is typed in.
   */
  @Post('me/mobile/residency')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
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

  /** The uploaded file itself, private to its owner, for the in-app viewer. */
  @Get('me/mobile/residency/:documentId')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
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

  /**
   * The photo of the side named by `?role=` (registered role when omitted) —
   * each role keeps its own picture. Same private, ETag-revalidated stream
   * the portal uses for its navbar avatar.
   */
  @Get('me/mobile/avatar')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
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
