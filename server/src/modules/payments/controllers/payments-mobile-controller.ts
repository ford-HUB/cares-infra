import { Controller, Get } from '@nestjs/common';
import { ZSerialize } from 'nest-zod';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { AvailablePaymentMethodsDto } from '../dto/payments-mobile-dto';
import { PaymentsMobileService } from '../services/payments-mobile-service';
import {
  AvailablePaymentMethodsResponseSchema,
  PAYMENTS_MOBILE_ROLE_TYPES,
} from '../validators/payments-mobile-validator';

/** The donor app asks this before showing the amount step. */
@Controller('v1/payments')
@Roles(...PAYMENTS_MOBILE_ROLE_TYPES)
export class PaymentsMobileController {
  constructor(private readonly paymentsMobileService: PaymentsMobileService) {}

  @Get('methods')
  @ResponseMessage('Available payment methods')
  @ZSerialize(AvailablePaymentMethodsResponseSchema)
  async listMethods(): Promise<AvailablePaymentMethodsDto> {
    return this.paymentsMobileService.listAvailableMethods();
  }
}
