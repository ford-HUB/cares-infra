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

/** `@Roles` per handler: the return page is reached without a token. */
@Controller('v1/donations')
export class DonationsMobileController {
  constructor(
    private readonly donationsMobileService: DonationsMobileService,
  ) {}

  /** `Idempotency-Key` (one UUID per attempt) prevents double charges on retry. */
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

  /** Polled while a checkout is open. */
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

  /** Money and goods, latest first. */
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

  /** Also matches the portal's `site` segment; the site controller registers first so its literals win. */
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

  /** Plain "back to the app" page; the query outcome only tweaks the copy, the callback is authoritative. */
  @Get('payments/:id/return')
  @Public()
  paymentReturn(
    @Query('outcome') outcome: string | undefined,
    @Res() response: Response,
  ): void {
    response.type('html').send(renderPaymentReturnPage(outcome === 'success'));
  }
}
