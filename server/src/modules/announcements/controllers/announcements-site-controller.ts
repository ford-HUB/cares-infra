import { Controller, Get, Patch, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  AnnouncementDto,
  AnnouncementListDto,
  ListAnnouncementsQueryDto,
  SaveAnnouncementDto,
  SetAnnouncementPinnedDto,
  SetAnnouncementStateDto,
} from '../dto/announcements-site-dto';
import { AnnouncementsSiteService } from '../services/announcements-site-service';
import {
  AnnouncementListResponseSchema,
  AnnouncementResponseSchema,
  ListAnnouncementsQuerySchema,
  SaveAnnouncementSchema,
  SetAnnouncementPinnedSchema,
  SetAnnouncementStateSchema,
} from '../validators/announcements-site-validator';

const AnnouncementIdParamSchema = z.uuid('A valid announcement id is required');

/**
 * Notices are read across the portal — every role has System Notices in its nav — but
 * only admins and directors write them. The narrowing is per-handler for that reason.
 */
@Controller('v1/announcements')
@Roles(...PORTAL_ROLE_TYPES)
export class AnnouncementsSiteController {
  constructor(
    private readonly announcementsSiteService: AnnouncementsSiteService,
  ) {}

  @Get()
  @ResponseMessage('Announcements')
  @ZSerialize(AnnouncementListResponseSchema)
  async listAnnouncements(
    @ZQuery(ListAnnouncementsQuerySchema) query: ListAnnouncementsQueryDto,
  ): Promise<AnnouncementListDto> {
    return this.announcementsSiteService.listAnnouncements(query);
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Announcement created')
  @ZSerialize(AnnouncementResponseSchema)
  async createAnnouncement(
    @ZBody(SaveAnnouncementSchema) body: SaveAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AnnouncementDto> {
    return this.announcementsSiteService.createAnnouncement(user.sub, body);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Announcement saved')
  @ZSerialize(AnnouncementResponseSchema)
  async updateAnnouncement(
    @ZParam('id', AnnouncementIdParamSchema) id: string,
    @ZBody(SaveAnnouncementSchema) body: SaveAnnouncementDto,
  ): Promise<AnnouncementDto> {
    return this.announcementsSiteService.updateAnnouncement(id, body);
  }

  @Patch(':id/state')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Announcement state updated')
  @ZSerialize(AnnouncementResponseSchema)
  async setState(
    @ZParam('id', AnnouncementIdParamSchema) id: string,
    @ZBody(SetAnnouncementStateSchema) body: SetAnnouncementStateDto,
  ): Promise<AnnouncementDto> {
    return this.announcementsSiteService.setState(id, body);
  }

  @Patch(':id/pinned')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Announcement pin updated')
  @ZSerialize(AnnouncementResponseSchema)
  async setPinned(
    @ZParam('id', AnnouncementIdParamSchema) id: string,
    @ZBody(SetAnnouncementPinnedSchema) body: SetAnnouncementPinnedDto,
  ): Promise<AnnouncementDto> {
    return this.announcementsSiteService.setPinned(id, body.pinned);
  }
}
