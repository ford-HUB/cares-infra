import { z } from 'zod';

/** Canonical `+639XXXXXXXXX` only, so `phone_number` stays comparable. */
export const PH_MOBILE_NUMBER_PATTERN = /^\+639\d{9}$/;

export const PhoneNumberSchema = z
  .string()
  .trim()
  .regex(
    PH_MOBILE_NUMBER_PATTERN,
    'Enter an 11-digit Philippine mobile number (09XXXXXXXXX)',
  );
