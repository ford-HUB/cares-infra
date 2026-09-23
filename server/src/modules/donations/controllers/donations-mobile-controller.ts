import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  CreateDonationPaymentDto,
  CreateGoodsDonationDto,
  DonationDto,
  DonationListDto,
  DonationPaymentDto,
  DonationPaymentListDto,
  UpdateGoodsDonationDto,
} from '../dto/donations-mobile-dto';
import { DonationsMobileService } from '../services/donations-mobile-service';
import { renderPaymentReturnPage } from '../services/payment-return-page';
import {
  CreateDonationPaymentSchema,
  CreateGoodsDonationSchema,
  DONATIONS_MOBILE_ROLE_TYPES,
  DonationIdSchema,
  DonationListResponseSchema,
  DonationPaymentIdSchema,
  DonationPaymentListResponseSchema,
  DonationPaymentResponseSchema,
  DonationResponseSchema,
  IdempotencyKeySchema,
  UpdateGoodsDonationSchema,
} from '../validators/donations-mobile-validator';

/**
 * The donor's side of money donations: open a checkout, watch it, list past
 * ones. `@Roles` sits on each handler rather than the class because the
 * return page below is reached by a browser with no token at all.
 */
@Controller('v1/donations')
export class DonationsMobileController {
  constructor(
    private readonly donationsMobileService: DonationsMobileService,
  ) {}

  /**
   * Opens a checkout with the chosen channel. `Idempotency-Key` is required:
   * the app generates one UUID per attempt and re-sends it on retry, so a
   * flaky connection can never open two charges for one tap.
   */
  @Post('payments')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Checkout ready')
  @ZSerialize(DonationPaymentResponseSchema)
  async createPayment(
    @ZBody(CreateDonationPaymentSchema) body: CreateDonationPaymentDto,
    @CurrentUser() user: JwtPayload,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<DonationPaymentDto> {
    const key = IdempotencyKeySchema.safeParse(idempotencyKey);
    if (!key.success) {
      throw new BadRequestException(
        'Idempotency-Key header is required and must be a UUID',
      );
    }
    return this.donationsMobileService.createPayment(
      user.sub,
      user.email,
      key.data,
      body,
    );
  }

  @Get('payments/me')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Your donation payments')
  @ZSerialize(DonationPaymentListResponseSchema)
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationPaymentListDto> {
    return this.donationsMobileService.listMine(user.sub);
  }

  /** Polled by the app while a checkout is open in GCash / the browser / a QR. */
  @Get('payments/:id')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Donation payment')
  @ZSerialize(DonationPaymentResponseSchema)
  async getPayment(
    @ZParam('id', DonationPaymentIdSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationPaymentDto> {
    return this.donationsMobileService.getPayment(user.sub, id);
  }

  // ------------------------------------------------------------- ledger

  /** Every donation the donor made — money and goods — latest first. */
  @Get('me')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Your donations')
  @ZSerialize(DonationListResponseSchema)
  async listDonations(
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationListDto> {
    return this.donationsMobileService.listDonations(user.sub);
  }

  @Post('goods')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Donation pledged')
  @ZSerialize(DonationResponseSchema)
  async pledgeGoods(
    @ZBody(CreateGoodsDonationSchema) body: CreateGoodsDonationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationDto> {
    return this.donationsMobileService.pledgeGoods(user.sub, body);
  }

  /**
   * `:id` also matches the portal's `site` segment — `DonationsModule`
   * registers the site controller first so its literal routes win.
   */
  @Get(':id')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Donation')
  @ZSerialize(DonationResponseSchema)
  async getDonation(
    @ZParam('id', DonationIdSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationDto> {
    return this.donationsMobileService.getDonation(user.sub, id);
  }

  @Patch(':id/goods')
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Donation updated')
  @ZSerialize(DonationResponseSchema)
  async updateGoods(
    @ZParam('id', DonationIdSchema) id: string,
    @ZBody(UpdateGoodsDonationSchema) body: UpdateGoodsDonationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationDto> {
    return this.donationsMobileService.updateGoods(user.sub, id, body);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(...DONATIONS_MOBILE_ROLE_TYPES)
  @ResponseMessage('Donation cancelled')
  @ZSerialize(DonationResponseSchema)
  async cancelGoods(
    @ZParam('id', DonationIdSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DonationDto> {
    return this.donationsMobileService.cancelGoods(user.sub, id);
  }

  /**
   * Where GCash and the hosted checkout send the browser afterwards. It is a
   * plain "go back to the app" page — the outcome in the query is only a hint
   * for the copy; the real status comes from the callback and is what the app
   * polls for.
   */
  @Get('payments/:id/return')
  @Public()
  paymentReturn(
    @Query('outcome') outcome: string | undefined,
    @Res() response: Response,
  ): void {
    response.type('html').send(renderPaymentReturnPage(outcome === 'success'));
  }
}
