import { z } from 'zod';
import {
  AvailablePaymentMethodSchema,
  AvailablePaymentMethodsResponseSchema,
} from '../validators/payments-mobile-validator';

export type AvailablePaymentMethodDto = z.infer<
  typeof AvailablePaymentMethodSchema
>;
export type AvailablePaymentMethodsDto = z.infer<
  typeof AvailablePaymentMethodsResponseSchema
>;
