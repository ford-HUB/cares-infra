import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  AUTHORIZE_RESPONSE,
  CONNECTION_PATH,
  MESSAGES_PATH,
  VALID_IN_REPLY_TO,
  VALID_MAIL,
  VALID_THREAD_ID,
  describeSendMailTable,
  useMailboxApp,
  CALLER,
} from '../mailbox-site-support';
import {
  HOSTILE_STRINGS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  SecurityPayload,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Mail Inbox Module · Connect / Send Mail — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Mail Inbox — input validation: recipient lists, length boundaries, optional
   * reply fields, and legitimate inputs that must still pass.
   */
  const emails = (count: number) => Array.from({ length: count }, (_, i) => `user${i}@cares.ph`);

  const recipientFixtures = (field: 'cc' | 'bcc'): LayerFixture[] => [
    { name: `${field} empty list`, input: { ...VALID_MAIL, [field]: [] }, expected: 'PASS' },
    { name: `${field} at max`, input: { ...VALID_MAIL, [field]: emails(50) }, expected: 'PASS' },
  ];

  // The Gmail message envelope needs only a recipient: the composer enforces a
  // non-empty body, the API lets subject and body default to empty.
  const fixtures: LayerFixture[] = [
    { name: 'minimal body', input: { to: VALID_MAIL.to }, expected: 'PASS' },
    {
      name: 'every optional field',
      input: {
        ...VALID_MAIL,
        cc: ['cc@cares.ph'],
        bcc: ['bcc@cares.ph'],
        thread_id: VALID_THREAD_ID,
        in_reply_to: VALID_IN_REPLY_TO,
      },
      expected: 'PASS',
    },
    { name: 'to at max', input: { ...VALID_MAIL, to: emails(50) }, expected: 'PASS' },
    { name: 'to with a legit apostrophe', input: { ...VALID_MAIL, to: ["o'neil@cares.ph"] }, expected: 'PASS' },

    ...recipientFixtures('cc'),
    ...recipientFixtures('bcc'),

    // subject
    { name: 'subject empty', input: { ...VALID_MAIL, subject: '' }, expected: 'PASS' },
    { name: 'subject at max', input: { ...VALID_MAIL, subject: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'subject at max once trimmed', input: { ...VALID_MAIL, subject: `  ${'a'.repeat(500)}  ` }, expected: 'PASS' },
    { name: 'subject of a typical reply', input: { ...VALID_MAIL, subject: "Re: [Event] 50% slots left — what's next?!" }, expected: 'PASS' },
    { name: 'subject with accents and emoji', input: { ...VALID_MAIL, subject: 'Salamat, Señora! 🙏' }, expected: 'PASS' },

    // body
    { name: 'body empty', input: { ...VALID_MAIL, body: '' }, expected: 'PASS' },
    { name: 'body at max', input: { ...VALID_MAIL, body: 'a'.repeat(100_000) }, expected: 'PASS' },
    { name: 'body with line breaks', input: { ...VALID_MAIL, body: 'Line one\r\nLine two\nLine three' }, expected: 'PASS' },

    // thread_id
    { name: 'thread_id valid', input: { ...VALID_MAIL, thread_id: VALID_THREAD_ID }, expected: 'PASS' },
    { name: 'thread_id at max', input: { ...VALID_MAIL, thread_id: 'a'.repeat(200) }, expected: 'PASS' },

    // in_reply_to
    { name: 'in_reply_to valid', input: { ...VALID_MAIL, in_reply_to: VALID_IN_REPLY_TO }, expected: 'PASS' },
    { name: 'in_reply_to at max', input: { ...VALID_MAIL, in_reply_to: `<${'a'.repeat(483)}@mail.gmail.com>` }, expected: 'PASS' },
  ];

  describe('mailbox site — input validation', () => {
    const ctx = useMailboxApp();

    describe(`POST ${MESSAGES_PATH}`, () => {
      describeSendMailTable(ctx, fixtures);
    });

    describe(`POST ${CONNECTION_PATH}`, () => {
      asCase('valid', 'Staff triggers the action with no body').it('needs no body and returns the authorization link', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CONNECTION_PATH });
        expect(outcome.status).toBe(200);
        expect(outcome.body).toEqual({
          ok: true,
          message: 'Google authorization link created',
          data: AUTHORIZE_RESPONSE,
        });
        expect(ctx.service.createAuthorizeUrl).toHaveBeenCalledTimes(1);
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Mail Inbox — normalisation: what `sendMail` hands the service. Subject and
   * reply fields are trimmed, subject and body default to empty, and the body is
   * kept exactly as written.
   */
  describe('mailbox site — normalisation', () => {
    const ctx = useMailboxApp();

    describe(`POST ${MESSAGES_PATH}`, () => {
      asCase('valid', 'Staff enters the subject and reply fields with surrounding spaces').it('trims the subject and reply fields, and sends as the caller', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: MESSAGES_PATH,
          body: {
            ...VALID_MAIL,
            subject: `  ${VALID_MAIL.subject}  `,
            thread_id: ` ${VALID_THREAD_ID} `,
            in_reply_to: ` ${VALID_IN_REPLY_TO} `,
          },
        });
        expect(ctx.service.sendMail).toHaveBeenCalledWith(CALLER.sub, {
          ...VALID_MAIL,
          thread_id: VALID_THREAD_ID,
          in_reply_to: VALID_IN_REPLY_TO,
        });
      });

      asCase('valid', 'Staff leaves the optional fields out').it('defaults a missing subject and body to empty strings', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: MESSAGES_PATH, body: { to: VALID_MAIL.to } });
        expect(ctx.service.sendMail).toHaveBeenCalledWith(CALLER.sub, { to: VALID_MAIL.to, subject: '', body: '' });
      });

      asCase('valid', 'Staff writes a mail body with leading and trailing whitespace').it('keeps the body exactly as written, including outer whitespace', async () => {
        const body = '  Indented first line\n\nLast line  \n';
        await runApiLayer(ctx.app, { method: 'post', path: MESSAGES_PATH, body: { ...VALID_MAIL, body } });
        expect(ctx.service.sendMail.mock.calls[0][1].body).toBe(body);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Mail Inbox — security, per field class:
   *   to / cc / bcc        constrained: every hostile string FAILs
   *   thread_id            constrained (Gmail id): every hostile string FAILs
   *   in_reply_to          constrained (Message-ID, written raw into mail headers): every hostile string FAILs
   *   subject              free text (replies carry any punctuation), but written into
   *                        the Subject header: control characters and CRLF FAIL
   *   body                 free text, not trimmed, base64-encoded when sent: everything PASSes
   * plus type confusion, mass assignment and prototype pollution.
   */
  const hostileFixtures = (
    field: string,
    payloads: SecurityPayload[],
    build: (value: unknown) => Record<string, unknown>,
    expected: 'PASS' | 'FAIL',
    issuePath?: string,
  ): LayerFixture[] =>
    payloads.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID_MAIL, ...build(p.value) },
      expected,
      ...(issuePath ? { field: issuePath } : {}),
    }));

  const fixtures: LayerFixture[] = [
    ...hostileFixtures(
      'subject',
      [...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS],
      (value) => ({ subject: value }),
      'PASS',
    ),

    ...hostileFixtures('body', HOSTILE_STRINGS, (value) => ({ body: value }), 'PASS'),
  ];

  describe('mailbox site — security', () => {
    const ctx = useMailboxApp();

    describe(`POST ${MESSAGES_PATH}`, () => {
      describeSendMailTable(ctx, fixtures);
    });
  });
}
