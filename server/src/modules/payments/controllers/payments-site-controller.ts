import { Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import {
  DonationPaymentMethod,
  PermissionKey,
  RoleType,
} from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ConfirmAccountProofDto,
  PaymentSettingsDto,
  TestPaymentGatewayDto,
  UpdatePaymentSettingsDto,
} from '../dto/payments-site-dto';
import { PaymentsSiteService } from '../services/payments-site-service';
import {
  ConfirmAccountProofSchema,
  PaymentMethodParamSchema,
  PaymentSettingsResponseSchema,
  TestPaymentGatewaySchema,
  UpdatePaymentSettingsSchema,
} from '../validators/payments-site-validator';

/**
 * The Payments module in the director portal. Where donor money lands is a finance
 * decision, so the role is narrowed to the director and the admin on top of the
 * right — a coordinator granted the right by mistake still cannot repoint the account.
 */
@Controller('v1/payments/settings')
@Roles(RoleType.DIRECTOR, RoleType.ADMIN)
@RequirePermission(PermissionKey.PAYMENT_SETTINGS_MANAGE)
export class PaymentsSiteController {
  constructor(private readonly paymentsSiteService: PaymentsSiteService) {}

  @Get()
  @ResponseMessage('Payment settings')
  @ZSerialize(PaymentSettingsResponseSchema)
  async getSettings(): Promise<PaymentSettingsDto> {
    return this.paymentsSiteService.getSettings();
  }

  @Put()
  @ResponseMessage('Payment settings updated')
  @ZSerialize(PaymentSettingsResponseSchema)
  async updateSettings(
    @ZBody(UpdatePaymentSettingsSchema) body: UpdatePaymentSettingsDto,
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<PaymentSettingsDto> {
    return this.paymentsSiteService.updateSettings(body, user, context);
  }

  /**
   * Re-runs the activation check for one channel: asks Xendit whether it is switched
   * on for this account and points its callbacks at our webhook. 200 either way — the
   * verdict rides back on the channel as `verification`.
   */
  @Post('methods/:method/verify')
  @HttpCode(200)
  @ResponseMessage('Payment method checked')
  @ZSerialize(PaymentSettingsResponseSchema)
  async verifyMethod(
    @ZParam('method', PaymentMethodParamSchema) method: DonationPaymentMethod,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    return this.paymentsSiteService.verifyMethod(method, user);
  }

  /**
   * Sends the token payout that proves CARES holds the account this channel pays into.
   * The amount is random and never returned — reporting it back is the proof.
   */
  @Post('methods/:method/account-proof')
  @HttpCode(200)
  @ResponseMessage('Test payout sent')
  @ZSerialize(PaymentSettingsResponseSchema)
  async startAccountProof(
    @ZParam('method', PaymentMethodParamSchema) method: DonationPaymentMethod,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    return this.paymentsSiteService.startAccountProof(method, user);
  }

  /** The director reports what arrived; a match verifies the account. */
  @Post('methods/:method/account-proof/confirm')
  @HttpCode(200)
  @ResponseMessage('Account proof checked')
  @ZSerialize(PaymentSettingsResponseSchema)
  async confirmAccountProof(
    @ZParam('method', PaymentMethodParamSchema) method: DonationPaymentMethod,
    @ZBody(ConfirmAccountProofSchema) body: ConfirmAccountProofDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    return this.paymentsSiteService.confirmAccountProof(
      method,
      body.amount,
      user,
    );
  }

  /** Proves the key against Xendit. 200 either way — the verdict is in the body. */
  @Post('test')
  @HttpCode(200)
  @ResponseMessage('Payment gateway tested')
  @ZSerialize(PaymentSettingsResponseSchema)
  async testConnection(
    @ZBody(TestPaymentGatewaySchema) body: TestPaymentGatewayDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    return this.paymentsSiteService.testConnection(body, user);
  }
}
