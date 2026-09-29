import { z } from 'zod';
import {
  CertificateRecipientListResponseSchema,
  CertificateRecipientResponseSchema,
  RemindRecipientsResponseSchema,
} from '../validators/certificates-site-validator';

export type CertificateRecipientDto = z.infer<
  typeof CertificateRecipientResponseSchema
>;
export type CertificateRecipientListDto = z.infer<
  typeof CertificateRecipientListResponseSchema
>;
export type RemindRecipientsDto = z.infer<
  typeof RemindRecipientsResponseSchema
>;
