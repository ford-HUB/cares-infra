import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

/** Reversible (the key must be sent to the gateway). Format `v1.<iv>.<tag>.<ciphertext>`, base64url; the version allows rotation. */
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/** From `CREDENTIAL_ENCRYPTION_KEY`, else `JWT_SECRET`. Fixed salt so every instance derives the same key. */
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

/** Null when unreadable (other key, truncated); callers treat it as unsaved. */
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

/** Lets the portal tell saved keys apart. */
export function secretTail(plaintext: string, length = 4): string {
  return plaintext.trim().slice(-length);
}
