import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

/**
 * Reversible at-rest encryption for the third-party credentials the portal stores —
 * today the Xendit secret key and its callback token. Hashing is not an option: the
 * server has to hand the real key back to the gateway on every charge.
 *
 * Format is `v1.<iv>.<tag>.<ciphertext>`, all base64url. The version prefix is there
 * so a future key rotation or algorithm change can tell old rows apart instead of
 * failing to parse them.
 */
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Derived from `CREDENTIAL_ENCRYPTION_KEY`, or from `JWT_SECRET` when that is not set
 * so a development install works out of the box. The salt is fixed on purpose: the
 * same secret must derive the same key across restarts and across API instances, or
 * rows written by one process become unreadable to the next.
 */
const KEY_SALT = 'cares.credential.v1';

let cachedKey: { source: string; key: Buffer } | null = null;

function encryptionKey(): Buffer {
  const source = (
    process.env.CREDENTIAL_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    ''
  ).trim();
  if (!source) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY (or JWT_SECRET) must be set before stored credentials can be read or written',
    );
  }
  if (cachedKey?.source !== source) {
    cachedKey = { source, key: scryptSync(source, KEY_SALT, KEY_BYTES) };
  }
  return cachedKey.key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const body = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    body.toString('base64url'),
  ].join('.');
}

/**
 * Null when the stored value cannot be read — a row written under a different
 * encryption key, or a truncated one. Callers treat that as "no credential saved"
 * rather than crashing: a bad row must not take the whole payments screen down.
 */
export function decryptSecret(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;

  const [version, iv, tag, body] = stored.split('.');
  if (version !== VERSION || !iv || !tag || !body) return null;

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(body, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/** The tail the portal shows so two saved keys can be told apart. */
export function secretTail(plaintext: string, length = 4): string {
  return plaintext.trim().slice(-length);
}
