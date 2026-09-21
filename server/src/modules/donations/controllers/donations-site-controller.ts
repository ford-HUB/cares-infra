import { Controller, Get, Patch } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { PermissionKey } from '../../../infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from '../../../shared/constants/portal-role-types';
import { CurrentUser } from '../../../shared/decorators/current-user-decorator';
import { RequirePermission } from '../../../shared/decorators/require-permission-decorator';
import { ResponseMessage } from '../../../shared/decorators/response-message-decorator';
import { Roles } from '../../../shared/decorators/roles-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  ChangeDonationStatusDto,
  DonationsSiteQueryDto,
  SiteDonationDto,
  SiteDonationListDto,
} from '../dto/donations-site-dto';
import { DonationsSiteService } from '../services/donations-site-service';
import { DonationIdSchema } from '../validators/donations-mobile-validator';
import {
  ChangeDonationStatusSchema,
  DonationsSiteQuerySchema,
  SiteDonationListResponseSchema,
  SiteDonationResponseSchema,
} from '../validators/donations-site-validator';

/** The portal's Donation Tracking: read the ledger, move a donation along. */
@Controller('v1/donations')
@Roles(...PORTAL_ROLE_TYPES)
export class DonationsSiteController {
  constructor(private readonly donationsSiteService: DonationsSiteService) {}

  @Get('site')
  @RequirePermission(PermissionKey.DONATIONS_VIEW)
  @ResponseMessage('Donations')
  @ZSerialize(SiteDonationListResponseSchema)
  async list(
    @ZQuery(DonationsSiteQuerySchema) query: DonationsSiteQueryDto,
  ): Promise<SiteDonationListDto> {
    return this.donationsSiteService.list(query);
  }

  @Get('site/:id')
  @RequirePermission(PermissionKey.DONATIONS_VIEW)
  @ResponseMessage('Donation')
  @ZSerialize(SiteDonationResponseSchema)
  async get(
    @ZParam('id', DonationIdSchema) id: string,
  ): Promise<SiteDonationDto> {
    return this.donationsSiteService.get(id);
  }

  @Patch('site/:id/status')
  @RequirePermission(PermissionKey.DONATIONS_RECORD)
  @ResponseMessage('Donation status updated')
  @ZSerialize(SiteDonationResponseSchema)
  async changeStatus(
    @ZParam('id', DonationIdSchema) id: string,
    @ZBody(ChangeDonationStatusSchema) body: ChangeDonationStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SiteDonationDto> {
    return this.donationsSiteService.changeStatus(
      user,
      await this.donationsSiteService.actorLabel(user),
      id,
      body,
    );
  }
}
