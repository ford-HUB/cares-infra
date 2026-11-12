import { asCase } from '../../../../config/test-case';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  VALID_CONTACT_ID,
  VALID_MESSAGE,
  readPath,
  sendPath,
  useChatApp,
  READ_ENDPOINT,
  SEND_ENDPOINT,
  describeContactIdTable,
  describeMessageBodyTable,
} from '../chat-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';
import { SendChatMessageSchema } from '../../../../../src/modules/chat/validators/chat-site-validator';

/**
 * Chat Module · Send Message / Mark Read — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Chat — error handling: unexpected service errors are masked as a generic 500
   * with nothing leaked, and the service's deliberate HttpExceptions keep their
   * status and message through the envelope.
   */
  describe('chat site — error handling', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      const send = () =>
        runApiLayer(ctx.app, { method: 'post', path: sendPath(VALID_CONTACT_ID), body: VALID_MESSAGE });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.sendMessage.mockRejectedValueOnce(new Error('syntax error at or near "OR"'));
        const outcome = await send();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'User sends a message with neither text nor attachment', 'Request fails with 400; status and message are kept in the { ok: false } envelope').it('keeps the 400 for a message with neither text nor attachment', async () => {
        ctx.service.sendMessage.mockRejectedValueOnce(new BadRequestException('A message needs text or an attachment'));
        const outcome = await send();
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('A message needs text or an attachment');
      });

      asCase('invalid', 'Request made when the contact is not reachable', 'Request fails with 403; status and message are kept in the { ok: false } envelope').it('keeps the 403 when the contact is not reachable', async () => {
        ctx.service.sendMessage.mockRejectedValueOnce(new ForbiddenException('You cannot message this user'));
        const outcome = await send();
        expect(outcome.status).toBe(403);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('You cannot message this user');
      });
    });

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      const read = () => runApiLayer(ctx.app, { method: 'post', path: readPath(VALID_CONTACT_ID) });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.markRead.mockRejectedValueOnce(new Error('relation "ChatConversation" does not exist'));
        const outcome = await read();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'Request made when there is no conversation yet', 'Request fails with 404; status and message are kept in the { ok: false } envelope').it('keeps the 404 when there is no conversation yet', async () => {
        ctx.service.markRead.mockRejectedValueOnce(new NotFoundException('No conversation with that contact yet'));
        const outcome = await read();
        expect(outcome.status).toBe(404);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('No conversation with that contact yet');
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Chat — input validation: the contactId path param on both POSTs, and the
   * sendMessage body's default, length bound and legitimate shapes.
   */
  const contactIdFixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'contact-1', expected: 'FAIL' },
    { name: 'uuid missing a character', input: VALID_CONTACT_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_CONTACT_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_CONTACT_ID} `, expected: 'FAIL' },
    { name: 'numeric id', input: '42', expected: 'FAIL' },
  ];

  // `body` is free text. Empty and whitespace-only pass the schema on purpose: the
  // message may be attachments only, and the service enforces "text or attachment".
  const bodyFixtures: LayerFixture[] = [
    { name: 'body over max', input: { body: 'a'.repeat(2001) }, expected: 'FAIL', field: 'body' },
  ];

  describe('chat site — input validation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      describe('contactId', () => describeContactIdTable(ctx, SEND_ENDPOINT, contactIdFixtures));
      describe('body', () => describeMessageBodyTable(ctx, bodyFixtures));
    });

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      describe('contactId', () => describeContactIdTable(ctx, READ_ENDPOINT, contactIdFixtures));
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Chat — normalisation: the message body is trimmed and defaulted by the
   * schema, and markRead passes only the validated contactId — a stray body is
   * never forwarded.
   */
  describe('chat site — normalisation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      asCase('invalid', 'Client sends a body to Mark Read, which takes none').it('passes only the contactId to the service, ignoring any body', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: readPath(VALID_CONTACT_ID),
          body: { contact_id: 'someone-else', unread: 99 },
        });
        expect(ctx.service.markRead).toHaveBeenCalledTimes(1);
        const call = ctx.service.markRead.mock.calls[0];
        expect(call).toHaveLength(2);
        expect(call[1]).toBe(VALID_CONTACT_ID);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Chat — security: hostile strings in the contactId path param (a uuid, so all
   * must FAIL), per-class payloads in the message body, type confusion, mass
   * assignment and prototype pollution.
   */
  const contactIdFixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `contactId ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: "contactId ← uuid with SQL tail", input: `${VALID_CONTACT_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'contactId ← uuid with stacked query', input: `${VALID_CONTACT_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  const bodyFixtures: LayerFixture[] = [
    // The field trims, so it is treated as sanitised: control characters other than
    // the CRLF line breaks multipart encoding produces must not get through.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `body ← ${p.category}: ${p.label}`,
      input: { body: p.value },
      expected: 'FAIL',
      field: 'body',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `body ← ${p.category}: ${p.label}`,
      input: { body: p.value },
      expected: 'FAIL',
      field: 'body',
    })),
    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_MESSAGE, ...extra },
      expected: 'FAIL',
    })),
    // The message is always sent as the caller; a forged sender or target must not be accepted.
    { name: 'mass assignment: sender_id', input: { ...VALID_MESSAGE, sender_id: VALID_CONTACT_ID }, expected: 'FAIL' },
    { name: 'mass assignment: conversation_id', input: { ...VALID_MESSAGE, conversation_id: VALID_CONTACT_ID }, expected: 'FAIL' },
  ];

  describe('chat site — security', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      describe('contactId', () => describeContactIdTable(ctx, SEND_ENDPOINT, contactIdFixtures));
      describe('body', () => describeMessageBodyTable(ctx, bodyFixtures));

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(SendChatMessageSchema, { ...VALID_MESSAGE, sender_id: VALID_CONTACT_ID });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: sendPath(VALID_CONTACT_ID),
          rawBody: withPollution(VALID_MESSAGE, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.sendMessage).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      describe('contactId', () => describeContactIdTable(ctx, READ_ENDPOINT, contactIdFixtures));
    });
  });
}
