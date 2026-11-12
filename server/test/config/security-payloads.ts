/**
 * Hostile inputs shared by every unit spec under `test/unit/modules/`.
 *
 * Specs never inline their own attack strings — they pull from here so every
 * module is held to the same catalogue, and a new technique added once is
 * exercised everywhere. Whether a payload must be rejected is NOT decided here:
 * each spec's fixture table states `expected: 'PASS' | 'FAIL'` per field.
 */

export type PayloadCategory =
  | 'sql-tautology'
  | 'sql-comment'
  | 'sql-stacked'
  | 'sql-union'
  | 'sql-blind'
  | 'sql-encoded'
  | 'special-char-series'
  | 'control-char'
  | 'unicode-confusable'
  | 'xss'
  | 'path-traversal'
  | 'ssrf'
  | 'private-object-key'
  | 'operator-injection'
  | 'prototype-pollution';

export interface SecurityPayload {
  category: PayloadCategory;
  label: string;
  value: unknown;
}

const p = (
  category: PayloadCategory,
  label: string,
  value: unknown,
): SecurityPayload => ({ category, label, value });

export const SQL_INJECTION_PAYLOADS: SecurityPayload[] = [
  p('sql-tautology', "' OR '1'='1", "' OR '1'='1"),
  p('sql-tautology', "' OR 1=1 --", "' OR 1=1 --"),
  p('sql-tautology', '" OR ""="', '" OR ""="'),
  p('sql-tautology', "admin'--", "admin'--"),
  p('sql-tautology', "') OR ('a'='a", "') OR ('a'='a"),
  p('sql-comment', 'trailing comment', "value'/*"),
  p('sql-comment', 'inline comment keyword split', "SEL/**/ECT * FR/**/OM users"),
  p('sql-comment', 'hash comment', "value' #"),
  p('sql-stacked', 'stacked DROP', "'; DROP TABLE \"User\"; --"),
  p('sql-stacked', 'stacked UPDATE', "1; UPDATE \"User\" SET role_type='ADMIN'"),
  p('sql-union', 'UNION SELECT', "' UNION SELECT NULL, password FROM \"Account\" --"),
  p('sql-union', 'UNION ALL', "1 UNION ALL SELECT version()"),
  p('sql-blind', 'pg_sleep', "'; SELECT pg_sleep(5); --"),
  p('sql-blind', 'boolean AND', "' AND 1=(SELECT 1) --"),
  p('sql-blind', 'CASE WHEN', "' || (CASE WHEN 1=1 THEN '' ELSE '' END) || '"),
  p('sql-encoded', 'url-encoded quote', '%27%20OR%201%3D1--'),
  p('sql-encoded', 'double url-encoded', '%2527%2520OR%25201%253D1'),
  p('sql-encoded', 'hex literal', '0x27204f5220313d31'),
  p('sql-encoded', 'char() concat', "CHAR(39)||CHAR(79)||CHAR(82)"),
  p('sql-encoded', 'backslash-escaped quote', "\\' OR 1=1 --"),
];

/** Characters that carry meaning in SQL, shells, templates or HTML. */
export const SPECIAL_CHARACTERS = [
  "'", '"', '`', ';', '-', '#', '/', '*', '\\', '%', '_', '$', '|', '&',
  '<', '>', '{', '}', '[', ']', '(', ')', '=', '+', '!', '?', '~', '^', '@', ':',
] as const;

/**
 * Runs of one special character (`''''`, `;;;;;;;;;;`) and mixed series
 * (`'";--/**\/`). A field constrained to names, codes, ids or emails should
 * reject every one of these; a field that legitimately allows punctuation
 * states that in its fixture as `expected: 'PASS'`.
 */
export const specialCharacterSeries = (lengths: number[] = [3, 10]): SecurityPayload[] => {
  const runs = SPECIAL_CHARACTERS.flatMap((char) =>
    lengths.map((n) => p('special-char-series', `${JSON.stringify(char)} x${n}`, char.repeat(n))),
  );

  const mixed = [
    `'";--`,
    `'";--/**/#`,
    `\`$(){}[]|&;`,
    `%_%_%_%`,
    `<>"'&;`,
    SPECIAL_CHARACTERS.join(''),
  ].map((value) => p('special-char-series', `mixed ${value}`, value));

  return [...runs, ...mixed];
};

export const CONTROL_CHAR_PAYLOADS: SecurityPayload[] = [
  p('control-char', 'null byte', 'value\u0000'),
  p('control-char', 'null byte mid-string', 'adm\u0000in'),
  p('control-char', 'CRLF injection', 'value\r\nX-Injected: 1'),
  p('control-char', 'backspace', 'value\u0008\u0008'),
  p('control-char', 'escape sequence', '\u001b[31mred'),
];

export const UNICODE_CONFUSABLE_PAYLOADS: SecurityPayload[] = [
  p('unicode-confusable', 'fullwidth apostrophe', '＇ OR 1=1 --'),
  p('unicode-confusable', 'right single quote', '’ OR 1=1 --'),
  p('unicode-confusable', 'RTL override', 'abc‮gpj.exe'),
  p('unicode-confusable', 'zero-width joiner', 'ad‍min'),
  p('unicode-confusable', 'cyrillic a homoglyph', 'аdmin'),
];

export const XSS_PAYLOADS: SecurityPayload[] = [
  p('xss', 'script tag', '<script>alert(1)</script>'),
  p('xss', 'img onerror', '<img src=x onerror=alert(1)>'),
  p('xss', 'svg onload', '<svg/onload=alert(1)>'),
  p('xss', 'javascript: url', 'javascript:alert(1)'),
  p('xss', 'template expression', '{{constructor.constructor("alert(1)")()}}'),
];

export const PATH_TRAVERSAL_PAYLOADS: SecurityPayload[] = [
  p('path-traversal', 'dot-dot slash', '../../etc/passwd'),
  p('path-traversal', 'dot-dot backslash', '..\\..\\windows\\win.ini'),
  p('path-traversal', 'encoded traversal', '%2e%2e%2f%2e%2e%2f'),
];

/**
 * Well-formed URLs that must not be fetched by the server. Only for fields that hold
 * an outbound URL, so they stay out of `HOSTILE_STRINGS`.
 */
export const SSRF_URL_PAYLOADS: SecurityPayload[] = [
  p('ssrf', 'file scheme', 'file:///etc/passwd'),
  p('ssrf', 'gopher scheme', 'gopher://localhost:6379/_INFO'),
  p('ssrf', 'ftp scheme', 'ftp://169.254.169.254/'),
  p('ssrf', 'data scheme', 'data:text/plain,hello'),
  p('ssrf', 'cloud metadata address', 'http://169.254.169.254/latest/meta-data/'),
  p('ssrf', 'cloud metadata over IPv6-mapped address', 'http://[::ffff:169.254.169.254]/'),
];

/**
 * Well-formed references to another feature's files in the shared private bucket. Only
 * for fields that hold a stored object, so they stay out of `HOSTILE_STRINGS`.
 */
export const PRIVATE_OBJECT_KEY_PAYLOADS: SecurityPayload[] = [
  p('private-object-key', 'bare key to a residency proof', 'user-requests/user-id/residency-1.jpg'),
  p('private-object-key', 'bare key to a profile file', 'mobile-profiles/user-id/residency-1.jpg'),
  p('private-object-key', 'bare key to an aid attachment', 'assistance-requests/user-id/1-0-medical.pdf'),
  p('private-object-key', 'bucket url to a residency proof', 'https://bucket.s3.amazonaws.com/user-requests/user-id/residency-1.jpg'),
  p('private-object-key', 'allowed prefix climbing out with dot-dot', 'events/../user-requests/user-id/residency-1.jpg'),
  p('private-object-key', 'allowed prefix climbing out in a url', 'https://bucket.s3.amazonaws.com/events/../user-requests/user-id/residency-1.jpg'),
];

/** Non-string values aimed at fields typed as strings — the type-confusion layer. */
export const OPERATOR_INJECTION_PAYLOADS: SecurityPayload[] = [
  p('operator-injection', '{ $ne: null }', { $ne: null }),
  p('operator-injection', '{ $gt: "" }', { $gt: '' }),
  p('operator-injection', 'Prisma-style { not: "" }', { not: '' }),
  p('operator-injection', 'array of values', ["' OR 1=1 --", 'x']),
  p('operator-injection', 'number instead of string', 1),
  p('operator-injection', 'boolean instead of string', true),
  p('operator-injection', 'null', null),
];

/**
 * Extra top-level keys. Every request schema is `.strict()`, so each of these
 * must come back FAIL with an `unrecognized_keys` issue.
 */
export const MASS_ASSIGNMENT_KEYS: Record<string, unknown>[] = [
  { role_type: 'ADMIN' },
  { is_protected: true },
  { user_id: '00000000-0000-0000-0000-000000000000' },
  { permissions: ['ALL'] },
];

/** Raw JSON bodies — `JSON.parse` keeps `__proto__` as an own key, an object literal would not. */
export const PROTOTYPE_POLLUTION_BODIES: SecurityPayload[] = [
  p('prototype-pollution', '__proto__', '{"__proto__":{"isAdmin":true}}'),
  p('prototype-pollution', 'constructor.prototype', '{"constructor":{"prototype":{"isAdmin":true}}}'),
];

/** Everything that is a string and hostile — the default sweep for a constrained text field. */
export const HOSTILE_STRINGS: SecurityPayload[] = [
  ...SQL_INJECTION_PAYLOADS,
  ...specialCharacterSeries(),
  ...CONTROL_CHAR_PAYLOADS,
  ...UNICODE_CONFUSABLE_PAYLOADS,
  ...XSS_PAYLOADS,
  ...PATH_TRAVERSAL_PAYLOADS,
];

/**
 * Fragments that must never appear in an error body. Their presence means a
 * database or runtime error leaked to the client instead of being masked by
 * `HttpExceptionFilter`.
 */
export const LEAK_SIGNATURES: RegExp[] = [
  /syntax error at or near/i,
  /PrismaClient\w*Error/,
  /\bprisma\.\w+\.(findMany|findUnique|create|update|delete)/i,
  /invalid input syntax for type/i,
  /\bat \S+\.(ts|js):\d+:\d+/,
  /unterminated quoted string/i,
  /relation "\w+" does not exist/i,
];
