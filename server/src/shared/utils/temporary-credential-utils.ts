import { randomBytes, randomInt } from 'node:crypto';

/**
 * The password rules a generated credential has to satisfy. Declared structurally
 * rather than imported from the security-policy module so this utility stays free of
 * a feature dependency — the caller passes whatever the policy currently says.
 */
export interface GeneratedPasswordRules {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_number: boolean;
  password_require_symbol: boolean;
}

/** Ambiguous glyphs are left out — these credentials get read aloud or copied by hand. */
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?';

/** Long enough that a short policy minimum still yields something worth issuing. */
const MINIMUM_GENERATED_LENGTH = 14;

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

/** Fisher-Yates with a CSPRNG, so the required characters don't sit in a fixed order. */
function shuffle(characters: string[]): string[] {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [characters[index], characters[swap]] = [
      characters[swap],
      characters[index],
    ];
  }
  return characters;
}

/**
 * A random password that satisfies the policy by construction: one character from
 * every required class first, then filler drawn from the classes the policy allows.
 */
export function generateTemporaryPassword(
  rules: GeneratedPasswordRules,
): string {
  const required: string[] = [];
  const alphabets: string[] = [];

  if (rules.password_require_uppercase) {
    required.push(pick(UPPERCASE));
  }
  if (rules.password_require_lowercase) {
    required.push(pick(LOWERCASE));
  }
  if (rules.password_require_number) {
    required.push(pick(DIGITS));
  }
  if (rules.password_require_symbol) {
    required.push(pick(SYMBOLS));
  }

  // Filler always spans the three alphanumeric classes: a policy that requires none
  // of them still has to produce a password, and one that forbids none is not a thing
  // the policy can express.
  alphabets.push(UPPERCASE, LOWERCASE, DIGITS);
  if (rules.password_require_symbol) {
    alphabets.push(SYMBOLS);
  }

  const filler = alphabets.join('');
  const length = Math.max(rules.password_min_length, MINIMUM_GENERATED_LENGTH);
  const characters = [...required];

  while (characters.length < length) {
    characters.push(pick(filler));
  }

  return shuffle(characters).join('');
}

/**
 * A mailbox-shaped identifier for a generated account. Nothing is delivered to it —
 * it is the sign-in name the administrator hands over, so it only has to be unique
 * and typeable.
 */
export function generateTemporaryEmail(
  firstname: string,
  lastname: string,
  domain: string,
): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12);

  const name = [slug(firstname), slug(lastname)].filter(Boolean).join('.');
  const suffix = randomBytes(3).toString('hex');

  return `${name || 'staff'}.${suffix}@${domain}`;
}

/**
 * `User.phone_number` is unique and required, and an account provisioned from an
 * emailed request has no phone behind it. A placeholder keeps the column honest until
 * the person completes their own profile — the same shape the admin seeder uses.
 */
export function generatePlaceholderPhone(): string {
  return `provisioned-${randomBytes(6).toString('hex')}`;
}
