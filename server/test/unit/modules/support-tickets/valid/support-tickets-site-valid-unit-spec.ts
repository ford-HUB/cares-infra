import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  TICKET_RESPONSE,
  VALID_REPLY,
  VALID_TICKET_ID,
  describeReplyBodyTable,
  describeTicketIdTable,
  replyPath,
  useSupportTicketsApp,
  CALLER,
} from '../support-tickets-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Support Tickets Module · Reply to Ticket — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Support Tickets reply — input validation: the ticket id path param, and the
   * reply body's required, empty and length rules plus legitimate inputs that
   * must pass.
   */
  const ticketIdFixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_TICKET_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_TICKET_ID.toUpperCase(), expected: 'PASS' },
  ];

  const bodyFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_REPLY, expected: 'PASS' },
    { name: 'body at min length', input: { body: 'a' }, expected: 'PASS' },
    { name: 'body at max length', input: { body: 'a'.repeat(2000) }, expected: 'PASS' },
    { name: 'body at max once trimmed', input: { body: `   ${'a'.repeat(2000)}   ` }, expected: 'PASS' },
    { name: 'body with line breaks', input: { body: 'Line one\nLine two\n\nLine four' }, expected: 'PASS' },
    { name: 'body with a tab', input: { body: 'Step 1:\tReinstall the app' }, expected: 'PASS' },
    { name: 'body with accents and emoji', input: { body: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  describe('support tickets site · reply — input validation', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      describe('id', () => describeTicketIdTable(ctx, ticketIdFixtures));
      describe('body', () => describeReplyBodyTable(ctx, bodyFixtures));

      asCase('valid', 'Staff submits a valid request').it('wraps the updated ticket in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: replyPath(VALID_TICKET_ID),
          body: VALID_REPLY,
        });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Reply sent', data: TICKET_RESPONSE });
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Support Tickets reply — normalisation: the schema trims the body, and the
   * service receives the validated id with the caller from the token as author.
   */
  describe('support tickets site · reply — normalisation', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      asCase('valid', 'Staff submits a valid request').it('passes the id, the caller and the trimmed body to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: replyPath(VALID_TICKET_ID),
          body: { body: `  ${VALID_REPLY.body}\n  ` },
        });
        expect(ctx.service.replyToTicket).toHaveBeenCalledTimes(1);
        expect(ctx.service.replyToTicket).toHaveBeenCalledWith(VALID_TICKET_ID, CALLER.sub, VALID_REPLY);
      });

      asCase('valid', 'Staff enters a body spanning several lines').it('keeps line breaks inside the body', async () => {
        const body = 'Line one\n\nLine three';
        await runApiLayer(ctx.app, { method: 'post', path: replyPath(VALID_TICKET_ID), body: { body } });
        expect(ctx.service.replyToTicket.mock.calls[0][2]).toEqual({ body });
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  const bodyFixtures: LayerFixture[] = [
    // Free text: stored as data through Prisma and escaped by the portal when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `body ← ${p.category}: ${p.label}`,
        input: { body: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reply can run over several lines and never reaches a mail header,
    // so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `body ← ${p.category}: ${p.label}`,
      input: { body: p.value },
      expected: 'PASS',
      field: 'body',
    })),
  ];

  describe('support tickets site · reply — security', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      describe('body', () => describeReplyBodyTable(ctx, bodyFixtures));
    });
  });
}
