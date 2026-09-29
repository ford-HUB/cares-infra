import { Controller, Delete, Get, Patch } from '@nestjs/common';
import { ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ListNotificationsQueryDto,
  NotificationFeedDto,
} from '../dto/notifications-site-dto';
import { NotificationsSiteService } from '../services/notifications-site-service';
import {
  ListNotificationsQuerySchema,
  NotificationFeedSchema,
} from '../validators/notifications-site-validator';

const NotificationIdParamSchema = z.uuid('A valid notification id is required');

/**
 * A user's own inbox. No permission gate beyond being a portal user: the rows are
 * already scoped to whoever is signed in, so there is nothing here to protect from
 * a colleague.
 */
@Controller('v1/notifications')
@Roles(...PORTAL_ROLE_TYPES)
export class NotificationsSiteController {
  constructor(
    private readonly notificationsSiteService: NotificationsSiteService,
  ) {}

  @Get()
  @ResponseMessage('Notifications')
  @ZSerialize(NotificationFeedSchema)
  async listNotifications(
    @CurrentUser() caller: JwtPayload,
    @ZQuery(ListNotificationsQuerySchema) query: ListNotificationsQueryDto,
  ): Promise<NotificationFeedDto> {
    return this.notificationsSiteService.listNotifications(caller, query);
  }

  /** Declared before `:id` so the literal segment wins the match. */
  @Patch('read-all')
  @ResponseMessage('All notifications marked read')
  @ZSerialize(NotificationFeedSchema)
  async markAllRead(
    @CurrentUser() caller: JwtPayload,
  ): Promise<NotificationFeedDto> {
    return this.notificationsSiteService.markAllRead(caller);
  }

  @Delete('read')
  @ResponseMessage('Read notifications cleared')
  @ZSerialize(NotificationFeedSchema)
  async clearRead(
    @CurrentUser() caller: JwtPayload,
  ): Promise<NotificationFeedDto> {
    return this.notificationsSiteService.clearRead(caller);
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked read')
  @ZSerialize(NotificationFeedSchema)
  async markRead(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', NotificationIdParamSchema) id: string,
  ): Promise<NotificationFeedDto> {
    return this.notificationsSiteService.markRead(caller, id);
  }

  @Delete(':id')
  @ResponseMessage('Notification dismissed')
  @ZSerialize(NotificationFeedSchema)
  async dismiss(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', NotificationIdParamSchema) id: string,
  ): Promise<NotificationFeedDto> {
    return this.notificationsSiteService.dismiss(caller, id);
  }
}
