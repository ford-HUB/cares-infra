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

/** Narrowed to director and admin on top of the right: it decides where money lands. */
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

  /** Checks activation and registers callbacks; 200 either way, verdict in `verification`. */
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

  /** Random amount, never returned: reporting it back is the proof. */
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

  /** A match verifies the account. */
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

  /** 200 either way; verdict in the body. */
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
