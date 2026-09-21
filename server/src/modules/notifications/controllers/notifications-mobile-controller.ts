import { Controller, Get, Patch } from '@nestjs/common';
import { ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  ListMobileNotificationsQueryDto,
  MobileNotificationFeedDto,
} from '../dto/notifications-mobile-dto';
import { NotificationsMobileService } from '../services/notifications-mobile-service';
import {
  ListMobileNotificationsQuerySchema,
  MobileNotificationFeedSchema,
  NotificationIdParamSchema,
} from '../validators/notifications-mobile-validator';

/**
 * The app's inbox. Mounted under `/mobile` so it never shadows the portal's
 * `GET /v1/notifications`, which carries a different role gate.
 */
@Controller('v1/notifications/mobile')
@Roles(RoleType.VOLUNTEER, RoleType.DONOR, RoleType.BENEFICIARY)
export class NotificationsMobileController {
  constructor(
    private readonly notificationsMobileService: NotificationsMobileService,
  ) {}

  @Get()
  @ResponseMessage('Notifications')
  @ZSerialize(MobileNotificationFeedSchema)
  async listNotifications(
    @CurrentUser() caller: JwtPayload,
    @ZQuery(ListMobileNotificationsQuerySchema)
    query: ListMobileNotificationsQueryDto,
  ): Promise<MobileNotificationFeedDto> {
    return this.notificationsMobileService.listNotifications(caller, query);
  }

  /** Declared before `:id` so the literal segment wins the match. */
  @Patch('read-all')
  @ResponseMessage('All notifications marked read')
  @ZSerialize(MobileNotificationFeedSchema)
  async markAllRead(
    @CurrentUser() caller: JwtPayload,
  ): Promise<MobileNotificationFeedDto> {
    return this.notificationsMobileService.markAllRead(caller);
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked read')
  @ZSerialize(MobileNotificationFeedSchema)
  async markRead(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', NotificationIdParamSchema) id: string,
  ): Promise<MobileNotificationFeedDto> {
    return this.notificationsMobileService.markRead(caller, id);
  }
}
