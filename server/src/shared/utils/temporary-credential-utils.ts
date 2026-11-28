import { randomBytes, randomInt } from 'node:crypto';

/** Structural to avoid depending on the security-policy module. */
export interface GeneratedPasswordRules {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_number: boolean;
  password_require_symbol: boolean;
}

/** No ambiguous glyphs: read aloud or typed by hand. */
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?';

/** Floor above short policy minimums. */
const MINIMUM_GENERATED_LENGTH = 14;

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

/** Fisher-Yates with a CSPRNG. */
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

/** One char from each required class, then filler from allowed classes. */
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

  // Filler always spans the three alphanumeric classes so any policy yields a password.
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

/** Undeliverable sign-in name; only needs to be unique and typeable. */
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

/** `User.phone_number` is unique and required; placeholder until the person updates it. */
export function generatePlaceholderPhone(): string {
  return `provisioned-${randomBytes(6).toString('hex')}`;
}
