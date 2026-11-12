import { asCase } from '../../../../config/test-case';
import { NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  VALID_REPLY,
  VALID_TICKET_ID,
  replyPath,
  useSupportTicketsApp,
  describeReplyBodyTable,
  describeTicketIdTable,
} from '../support-tickets-site-support';
import { ReplyToSupportTicketSchema } from '../../../../../src/modules/support-tickets/validators/support-tickets-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';

/**
 * Support Tickets Module · Reply to Ticket — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Support Tickets reply — error handling: unexpected service errors are masked as
   * a generic 500 with nothing leaked, and the service's deliberate HttpExceptions
   * keep their status and message through the envelope.
   */
  describe('support tickets site · reply — error handling', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      const reply = () =>
        runApiLayer(ctx.app, { method: 'post', path: replyPath(VALID_TICKET_ID), body: VALID_REPLY });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.replyToTicket.mockRejectedValueOnce(new Error('syntax error at or near "OR"'));
        const outcome = await reply();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'Request made when the ticket does not exist', 'Request fails with 404; status and message are kept in the { ok: false } envelope').it('keeps the 404 when the ticket does not exist', async () => {
        ctx.service.replyToTicket.mockRejectedValueOnce(new NotFoundException('Support ticket not found'));
        const outcome = await reply();
        expect(outcome.status).toBe(404);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('Support ticket not found');
      });

      asCase('invalid', 'Request made when the signed-in account no longer exists', 'Request fails with 404; status and message are kept in the { ok: false } envelope').it('keeps the 404 when the signed-in account no longer exists', async () => {
        ctx.service.replyToTicket.mockRejectedValueOnce(new NotFoundException('Signed-in account not found'));
        const outcome = await reply();
        expect(outcome.status).toBe(404);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('Signed-in account not found');
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Support Tickets reply — input validation: the ticket id path param, and the
   * reply body's required, empty and length rules plus legitimate inputs that
   * must pass.
   */
  const ticketIdFixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'ticket-1', expected: 'FAIL' },
    { name: 'uuid missing a character', input: VALID_TICKET_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_TICKET_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_TICKET_ID} `, expected: 'FAIL' },
    { name: 'reference number instead of an id', input: '10', expected: 'FAIL' },
  ];

  const bodyFixtures: LayerFixture[] = [
    { name: 'body missing', input: {}, expected: 'FAIL', field: 'body' },
    { name: 'body empty', input: { body: '' }, expected: 'FAIL', field: 'body' },
    { name: 'body whitespace-only', input: { body: '   ' }, expected: 'FAIL', field: 'body' },
    { name: 'body line breaks only', input: { body: '\n\r\n' }, expected: 'FAIL', field: 'body' },
    { name: 'body over max', input: { body: 'a'.repeat(2001) }, expected: 'FAIL', field: 'body' },
  ];

  describe('support tickets site · reply — input validation', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      describe('id', () => describeTicketIdTable(ctx, ticketIdFixtures));
      describe('body', () => describeReplyBodyTable(ctx, bodyFixtures));
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Support Tickets reply — security: hostile strings in the id path param (a uuid,
   * so all must FAIL), per-class payloads in the reply body, type confusion, mass
   * assignment and prototype pollution.
   */
  const ticketIdFixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `id ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'id ← uuid with SQL tail', input: `${VALID_TICKET_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'id ← uuid with stacked query', input: `${VALID_TICKET_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  const bodyFixtures: LayerFixture[] = [
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reply can run over several lines and never reaches a mail header,
    // so line breaks are the exception.
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
      input: { ...VALID_REPLY, ...extra },
      expected: 'FAIL',
    })),
    // The author is always the caller, and a reply must not be able to move the ticket.
    { name: 'mass assignment: author_id', input: { ...VALID_REPLY, author_id: VALID_TICKET_ID }, expected: 'FAIL' },
    { name: 'mass assignment: author_type', input: { ...VALID_REPLY, author_type: 'STAFF' }, expected: 'FAIL' },
    { name: 'mass assignment: status', input: { ...VALID_REPLY, status: 'CLOSED' }, expected: 'FAIL' },
    { name: 'mass assignment: assignee_id', input: { ...VALID_REPLY, assignee_id: VALID_TICKET_ID }, expected: 'FAIL' },
  ];

  describe('support tickets site · reply — security', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      describe('id', () => describeTicketIdTable(ctx, ticketIdFixtures));
      describe('body', () => describeReplyBodyTable(ctx, bodyFixtures));

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(ReplyToSupportTicketSchema, { ...VALID_REPLY, status: 'CLOSED' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: replyPath(VALID_TICKET_ID),
          rawBody: withPollution(VALID_REPLY, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.replyToTicket).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });
  });
}
