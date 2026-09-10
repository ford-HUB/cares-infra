import { z } from 'zod';

/**
 * Philippine mobile numbers only, in the one shape the clients normalise to:
 * `+63` followed by a ten-digit number starting with 9 (the local `09XXXXXXXXX`
 * with its leading zero dropped). Anything else — landlines, foreign numbers,
 * partial input — is rejected so `phone_number` stays comparable across accounts.
 */
export const PH_MOBILE_NUMBER_PATTERN = /^\+639\d{9}$/;

export const PhoneNumberSchema = z
  .string()
  .trim()
  .regex(
    PH_MOBILE_NUMBER_PATTERN,
    'Enter an 11-digit Philippine mobile number (09XXXXXXXXX)',
  );
