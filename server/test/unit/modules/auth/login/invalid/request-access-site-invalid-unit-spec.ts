import { expectSafeErrorEnvelope } from '../../../../../config/layer-harness';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SQL_INJECTION_PAYLOADS,
  SecurityPayload,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../../config/security-payloads';
import { defineCases } from '../../../../../config/test-case';
import {
  ACCESS_REQUEST,
  BODY_PREFIX,
  MODULE,
  Upload,
  VALID_ACCESS_REQUEST as VALID,
  expectRefusal,
  postAccessRequest,
  rejectsByValidation,
  rejectsEachByValidation,
  rejectsPrototypePollution,
  upload,
  useAuthSiteApp,
} from '../login-site-support';

/**
 * Request Access — invalid inputs. Each case Passes when the form is refused as
 * stated and no email goes out.
 */
const testCase = defineCases({ module: MODULE, unit: 'Request Access', kind: 'invalid', prefix: 'ACCESS' });

const MB = 1024 * 1024;

const SUBJECT_FAMILIES: [string, SecurityPayload[]][] = [
  ['SQL injection strings', SQL_INJECTION_PAYLOADS],
  ['special-character series', specialCharacterSeries()],
  ['control characters (null byte, CRLF, tab …)', CONTROL_CHAR_PAYLOADS],
  ['XSS markup', XSS_PAYLOADS],
];

describe('Request Access — invalid inputs', () => {
  const ctx = useAuthSiteApp();

  const expectNotSent = async (files: Upload[], status: number, message?: string) => {
    const outcome = await postAccessRequest(ctx, VALID, files);
    if (message) expectRefusal(outcome, status, message);
    else expect(outcome.status).toBe(status);
    expectSafeErrorEnvelope(outcome);
    expect(ctx.mailer.sendEmail).not.toHaveBeenCalled();
  };

  /* ── required fields and lengths ──────────────────────────────────────── */

  const fieldCases: [string, Record<string, unknown>, string][] = [
    ['Volunteer leaves the email field empty', { ...VALID, from_email: '' }, 'from_email'],
    ['Volunteer enters only spaces in the email field', { ...VALID, from_email: '   ' }, 'from_email'],
    ['Volunteer enters an invalid email format ("volunteer@")', { ...VALID, from_email: 'volunteer@' }, 'from_email'],
    ['Request is sent without an email field', { subject: VALID.subject, body: VALID.body }, 'from_email'],
    ['Volunteer leaves the subject empty', { ...VALID, subject: '' }, 'subject'],
    ['Volunteer enters only spaces in the subject', { ...VALID, subject: '   ' }, 'subject'],
    ['Volunteer enters a 201-character subject (over the 200 limit)', { ...VALID, subject: 'a'.repeat(201) }, 'subject'],
    ['Volunteer leaves the message empty', { ...VALID, body: '' }, 'body'],
    ['Volunteer enters only spaces in the message', { ...VALID, body: ' '.repeat(30) }, 'body'],
    ['Volunteer enters a 19-character message (under the 20 minimum)', { ...VALID, body: 'a'.repeat(19) }, 'body'],
    ['Volunteer pads a 19-character message with spaces to look longer', { ...VALID, body: `   ${'a'.repeat(19)}   ` }, 'body'],
    ['Volunteer enters a 10,001-character message (over the 10,000 limit)', { ...VALID, body: 'a'.repeat(10001) }, 'body'],
  ];
  for (const [description, input, field] of fieldCases) {
    testCase(description, `Request fails with "Validation failed" on ${field} (400); no email is sent`, () =>
      rejectsByValidation(ctx, ACCESS_REQUEST, input, field),
    );
  }

  /* ── hostile input ───────────────────────────────────────────────────── */

  testCase(
    `Attacker enters hostile strings in the email field (${HOSTILE_STRINGS.length} variants)`,
    'Request fails with "Validation failed" on from_email (400)',
    () => rejectsEachByValidation(ctx, ACCESS_REQUEST, HOSTILE_STRINGS, (value) => ({ ...VALID, from_email: value }), 'from_email'),
  );
  for (const [family, payloads] of SUBJECT_FAMILIES) {
    testCase(
      `Attacker enters ${family} in the subject — it becomes the mail Subject header (${payloads.length} variants)`,
      'Request fails with "Validation failed" on subject (400)',
      () => rejectsEachByValidation(ctx, ACCESS_REQUEST, payloads, (value) => ({ ...VALID, subject: value }), 'subject'),
    );
  }
  const messageControlChars = CONTROL_CHAR_PAYLOADS.filter((p) => p.label !== 'CRLF injection');
  testCase(
    `Attacker hides control characters other than line breaks in the message (${messageControlChars.length} variants)`,
    'Request fails with "Validation failed" on body (400)',
    () =>
      rejectsEachByValidation(
        ctx,
        ACCESS_REQUEST,
        messageControlChars,
        (value) => ({ ...VALID, body: `${BODY_PREFIX} ${value as string}` }),
        'body',
      ),
  );
  for (const field of ['from_email', 'subject', 'body'] as const) {
    testCase(
      `Attacker sends an object, array, number, boolean or null as ${field} (${OPERATOR_INJECTION_PAYLOADS.length} variants)`,
      `Request fails with "Validation failed" on ${field} (400)`,
      () => rejectsEachByValidation(ctx, ACCESS_REQUEST, OPERATOR_INJECTION_PAYLOADS, (value) => ({ ...VALID, [field]: value }), field),
    );
  }
  testCase(
    `Attacker adds privileged fields to the body (${MASS_ASSIGNMENT_KEYS.length} variants)`,
    'Request fails with "Validation failed" (400) — unknown fields are rejected',
    () =>
      rejectsEachByValidation(
        ctx,
        ACCESS_REQUEST,
        MASS_ASSIGNMENT_KEYS.map((extra) => ({ category: 'operator-injection', label: Object.keys(extra).join(', '), value: extra })),
        (extra) => ({ ...VALID, ...(extra as object) }),
      ),
  );
  testCase(
    `Attacker sends a __proto__ / constructor.prototype body (${PROTOTYPE_POLLUTION_BODIES.length} variants)`,
    'Request fails with "Validation failed" (400); Object.prototype is not polluted',
    () => rejectsPrototypePollution(ctx, ACCESS_REQUEST, VALID, PROTOTYPE_POLLUTION_BODIES),
  );

  /* ── attachments ─────────────────────────────────────────────────────── */

  testCase('Volunteer attaches 6 files (limit is 5)', 'Request fails (400); no email is sent', () => {
    it('layer 2 — api refuses', async () => {
      await expectNotSent(
        Array.from({ length: 6 }, (_, i) => upload(`file-${i + 1}.pdf`, 'application/pdf', 1024)),
        400,
      );
    });
  });
  testCase('Volunteer attaches an empty (0-byte) file', 'Request fails with "<file> is empty" (400)', () => {
    it('layer 2 — api refuses', async () => {
      await expectNotSent([upload('blank.pdf', 'application/pdf', 0)], 400, 'blank.pdf is empty');
    });
  });
  testCase('Volunteer attaches a file larger than 5 MB', 'Request fails with "<file> exceeds the 5 MB per-file limit" (400)', () => {
    it('layer 2 — api refuses', async () => {
      await expectNotSent([upload('big.pdf', 'application/pdf', 5 * MB + 1)], 400, 'big.pdf exceeds the 5 MB per-file limit');
    });
  });
  testCase(
    'Volunteer attaches files that are not PDF, image or Word (.exe, .zip, .html, .txt, .svg)',
    'Request fails with "<file> is not an accepted file type" (400)',
    () => {
      it.each([
        ['tool.exe', 'application/x-msdownload'],
        ['bundle.zip', 'application/zip'],
        ['page.html', 'text/html'],
        ['notes.txt', 'text/plain'],
        ['logo.svg', 'image/svg+xml'],
      ])('%s', async (name, type) => {
        await expectNotSent([upload(name, type, 1024)], 400, `${name} is not an accepted file type`);
      });
    },
  );
  testCase(
    'Volunteer attaches four 4 MB files — 16 MB combined (limit is 15 MB)',
    'Request fails with "The attachments exceed the 15 MB combined limit" (400)',
    () => {
      it('layer 2 — api refuses', async () => {
        await expectNotSent(
          Array.from({ length: 4 }, (_, i) => upload(`part-${i + 1}.pdf`, 'application/pdf', 4 * MB)),
          400,
          'The attachments exceed the 15 MB combined limit',
        );
      });
    },
  );

  /* ── system errors ───────────────────────────────────────────────────── */

  testCase(
    'The email server is down when the request is sent',
    'Request fails with "Unable to send your access request. …" (502)',
    () => {
      beforeEach(() => ctx.mailer.sendEmail.mockRejectedValue(new Error('SMTP connection refused') as never));
      it('layer 2 — api reports the delivery failure', async () => {
        const outcome = await postAccessRequest(ctx, VALID);
        expectRefusal(outcome, 502, 'Unable to send your access request. SMTP connection refused');
        expectSafeErrorEnvelope(outcome);
      });
    },
  );
});
