import { z } from 'zod';
import {
  ConfirmAccountProofSchema,
  PaymentMethodSettingSchema,
  PaymentSettingsResponseSchema,
  TestPaymentGatewaySchema,
  UpdatePaymentSettingsSchema,
} from '../validators/payments-site-validator';

export type PaymentMethodSettingDto = z.infer<
  typeof PaymentMethodSettingSchema
>;
export type UpdatePaymentSettingsDto = z.infer<
  typeof UpdatePaymentSettingsSchema
>;
export type TestPaymentGatewayDto = z.infer<typeof TestPaymentGatewaySchema>;
export type PaymentSettingsDto = z.infer<typeof PaymentSettingsResponseSchema>;
export type ConfirmAccountProofDto = z.infer<typeof ConfirmAccountProofSchema>;
