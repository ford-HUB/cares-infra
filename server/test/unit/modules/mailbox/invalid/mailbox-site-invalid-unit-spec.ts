import { asCase } from '../../../../config/test-case';
import { PreconditionFailedException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  CONNECTION_PATH,
  MESSAGES_PATH,
  VALID_MAIL,
  useMailboxApp,
  describeSendMailTable,
  CALLER,
} from '../mailbox-site-support';
import { SendMailSchema } from '../../../../../src/modules/mailbox/validators/mailbox-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SecurityPayload,
} from '../../../../config/security-payloads';

/**
 * Mail Inbox Module · Connect / Send Mail — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Mail Inbox — error handling: unexpected service errors are masked as a
   * generic 500 with nothing leaked, and the service's deliberate HttpExceptions
   * keep their status and message through the envelope.
   */
  const REAUTHORIZE_MESSAGE = 'Google ended the connection to this mailbox. Connect it again to continue.';

  describe('mailbox site — error handling', () => {
    const ctx = useMailboxApp();

    describe(`POST ${MESSAGES_PATH}`, () => {
      const send = () => runApiLayer(ctx.app, { method: 'post', path: MESSAGES_PATH, body: VALID_MAIL });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.sendMail.mockRejectedValueOnce(new Error('syntax error at or near "OR"'));
        const outcome = await send();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'Request made when the mailbox connection has ended', 'Request fails with 412; status and message are kept in the { ok: false } envelope').it('keeps the 412 when the mailbox connection has ended', async () => {
        ctx.service.sendMail.mockRejectedValueOnce(new PreconditionFailedException(REAUTHORIZE_MESSAGE));
        const outcome = await send();
        expect(outcome.status).toBe(412);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe(REAUTHORIZE_MESSAGE);
      });
    });

    describe(`POST ${CONNECTION_PATH}`, () => {
      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.createAuthorizeUrl.mockRejectedValueOnce(new Error('relation "GmailConnection" does not exist'));
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CONNECTION_PATH });
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Mail Inbox — input validation: recipient lists, length boundaries, optional
   * reply fields, and legitimate inputs that must still pass.
   */
  const emails = (count: number) => Array.from({ length: count }, (_, i) => `user${i}@cares.ph`);

  const recipientFixtures = (field: 'cc' | 'bcc'): LayerFixture[] => [
    { name: `${field} over max`, input: { ...VALID_MAIL, [field]: emails(51) }, expected: 'FAIL', field },
    { name: `${field} with a malformed address`, input: { ...VALID_MAIL, [field]: ['not-an-email'] }, expected: 'FAIL', field: `${field}.0` },
  ];

  // The Gmail message envelope needs only a recipient: the composer enforces a
  // non-empty body, the API lets subject and body default to empty.
  const fixtures: LayerFixture[] = [

    // to
    { name: 'to missing', input: { subject: VALID_MAIL.subject, body: VALID_MAIL.body }, expected: 'FAIL', field: 'to' },
    { name: 'to empty list', input: { ...VALID_MAIL, to: [] }, expected: 'FAIL', field: 'to' },
    { name: 'to over max', input: { ...VALID_MAIL, to: emails(51) }, expected: 'FAIL', field: 'to' },
    { name: 'to as one string, not a list', input: { ...VALID_MAIL, to: 'beneficiary@cares.ph' }, expected: 'FAIL', field: 'to' },
    { name: 'to with a malformed address', input: { ...VALID_MAIL, to: ['not-an-email'] }, expected: 'FAIL', field: 'to.0' },
    { name: 'to with an empty address', input: { ...VALID_MAIL, to: [''] }, expected: 'FAIL', field: 'to.0' },
    { name: 'to with a padded address', input: { ...VALID_MAIL, to: [' beneficiary@cares.ph '] }, expected: 'FAIL', field: 'to.0' },
    { name: 'to with one bad address among good', input: { ...VALID_MAIL, to: ['ok@cares.ph', 'bad@'] }, expected: 'FAIL', field: 'to.1' },

    ...recipientFixtures('cc'),
    ...recipientFixtures('bcc'),
    { name: 'subject over max', input: { ...VALID_MAIL, subject: 'a'.repeat(501) }, expected: 'FAIL', field: 'subject' },
    { name: 'body over max', input: { ...VALID_MAIL, body: 'a'.repeat(100_001) }, expected: 'FAIL', field: 'body' },
    { name: 'thread_id over max', input: { ...VALID_MAIL, thread_id: 'a'.repeat(201) }, expected: 'FAIL', field: 'thread_id' },
    { name: 'in_reply_to over max', input: { ...VALID_MAIL, in_reply_to: `<${'a'.repeat(484)}@mail.gmail.com>` }, expected: 'FAIL', field: 'in_reply_to' },
  ];

  describe('mailbox site — input validation', () => {
    const ctx = useMailboxApp();

    describe(`POST ${MESSAGES_PATH}`, () => {
      describeSendMailTable(ctx, fixtures);
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

  /** `to: [...]` with one bad address reports `to.0`; a non-array value reports `to` itself. */
  const recipientTypeFixtures = (field: 'to' | 'cc' | 'bcc'): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID_MAIL, [field]: p.value },
      expected: 'FAIL',
      field: Array.isArray(p.value) ? `${field}.0` : field,
    }));

  const typeFixtures = (field: 'subject' | 'body' | 'thread_id' | 'in_reply_to'): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID_MAIL, [field]: p.value },
      expected: 'FAIL',
      field,
    }));

  const fixtures: LayerFixture[] = [
    ...(['to', 'cc', 'bcc'] as const).flatMap((field) => [
      ...hostileFixtures(field, HOSTILE_STRINGS, (value) => ({ [field]: [value] }), 'FAIL', `${field}.0`),
      ...recipientTypeFixtures(field),
    ]),

    ...hostileFixtures('thread_id', HOSTILE_STRINGS, (value) => ({ thread_id: value }), 'FAIL', 'thread_id'),
    ...typeFixtures('thread_id'),

    ...hostileFixtures('in_reply_to', HOSTILE_STRINGS, (value) => ({ in_reply_to: value }), 'FAIL', 'in_reply_to'),
    ...typeFixtures('in_reply_to'),

    ...hostileFixtures('subject', CONTROL_CHAR_PAYLOADS, (value) => ({ subject: value }), 'FAIL', 'subject'),
    ...typeFixtures('subject'),

    ...typeFixtures('body'),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_MAIL, ...extra },
      expected: 'FAIL',
    })),
    // The sender is always the caller's linked Google account; it must not be forgeable.
    { name: 'mass assignment: from', input: { ...VALID_MAIL, from: 'director@cares.ph' }, expected: 'FAIL' },
    { name: 'mass assignment: reply_to', input: { ...VALID_MAIL, reply_to: 'attacker@cares.ph' }, expected: 'FAIL' },
    { name: 'mass assignment: headers', input: { ...VALID_MAIL, headers: { 'X-Injected': '1' } }, expected: 'FAIL' },
  ];

  describe('mailbox site — security', () => {
    const ctx = useMailboxApp();

    describe(`POST ${MESSAGES_PATH}`, () => {
      describeSendMailTable(ctx, fixtures);

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(SendMailSchema, { ...VALID_MAIL, from: 'director@cares.ph' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: MESSAGES_PATH,
          rawBody: withPollution(VALID_MAIL, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.sendMail).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });

    describe(`POST ${CONNECTION_PATH}`, () => {
      // No schema reads the body here, so nothing in it can choose whose mailbox gets linked.
      asCase('invalid', 'Attacker names another user in the body when connecting the mailbox').it('uses the caller from the token, never one named in the body', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: CONNECTION_PATH,
          body: { user_id: 'someone-else', sub: 'someone-else' },
        });
        expect(ctx.service.createAuthorizeUrl).toHaveBeenCalledTimes(1);
        expect(ctx.service.createAuthorizeUrl).toHaveBeenCalledWith(CALLER.sub);
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'The body changes nothing; Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('a pollution body changes nothing: $label', async (p) => {
        await runApiLayer(ctx.app, { method: 'post', path: CONNECTION_PATH, rawBody: p.value as string });
        expect(ctx.service.createAuthorizeUrl).toHaveBeenCalledWith(CALLER.sub);
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });
  });
}
