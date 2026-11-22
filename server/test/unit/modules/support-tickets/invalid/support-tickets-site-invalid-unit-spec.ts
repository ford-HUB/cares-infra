import { LayerFixture } from '../../../../config/layer-harness';
import { asCase } from '../../../../config/test-case';
import {
  MESSAGES,
  SUPPORT_TICKETS_MAX_LIMIT,
  VALID_ASSIGNEE_ID,
  VALID_NOTE,
  VALID_REPLY,
  VALID_TICKET_ID,
  describeListQueryTable,
  describeReplyBodyTable,
  describeTicketIdTable,
  describeUpdateBodyTable,
  expectNothingWritten,
  expectRefusal,
  replyToTicket,
  updateTicket,
  useSupportTicketsApp,
} from '../support-tickets-site-support';

/**
 * Support Tickets Module · List / Update / Reply to Ticket — invalid inputs (field
 * validation).
 *
 * Every case here is an intentionally wrong value for a field of the three portal
 * ticket endpoints. A case Passes when the system refuses it exactly as stated — a
 * refusal as expected is the correct result. The valid cases live in ../valid/.
 */

/** Malformed ticket ids, shared by Update and Reply. */
const ticketIdFixtures = (action: string): LayerFixture<string>[] => [
  { name: `Staff ${action} a ticket id that is not a uuid`, input: 'ticket-10', expected: 'FAIL' },
  { name: `Staff ${action} the reference number instead of the ticket id`, input: '10', expected: 'FAIL' },
  { name: `Staff ${action} a ticket id missing its last character`, input: VALID_TICKET_ID.slice(0, -1), expected: 'FAIL' },
  { name: `Staff ${action} a ticket id with an extra character`, input: `${VALID_TICKET_ID}0`, expected: 'FAIL' },
  { name: `Staff ${action} a ticket id without hyphens`, input: VALID_TICKET_ID.replace(/-/g, ''), expected: 'FAIL' },
  { name: `Staff ${action} a ticket id with surrounding spaces`, input: ` ${VALID_TICKET_ID} `, expected: 'FAIL' },
  { name: `Staff ${action} a ticket id with a non-hex character`, input: `${VALID_TICKET_ID.slice(0, -1)}g`, expected: 'FAIL' },
  { name: `Staff ${action} a blank ticket id`, input: ' ', expected: 'FAIL' },
];

/* ── List tickets ────────────────────────────────────────────────────────── */
{
  const queryFixtures: LayerFixture<Record<string, string>>[] = [
    { name: 'Staff filters by a status in lower case (open)', input: { status: 'open' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff filters by a status that does not exist (DONE)', input: { status: 'DONE' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff sends an empty status filter', input: { status: '' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff filters by "ALL" in upper case instead of "all"', input: { status: 'ALL' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff filters by a type that does not exist (PAYMENT)', input: { type: 'PAYMENT' }, expected: 'FAIL', field: 'type' },
    { name: 'Staff filters by a type in lower case (bug)', input: { type: 'bug' }, expected: 'FAIL', field: 'type' },
    { name: 'Staff sends an empty type filter', input: { type: '' }, expected: 'FAIL', field: 'type' },
    { name: 'Staff filters by a priority that does not exist (URGENT)', input: { priority: 'URGENT' }, expected: 'FAIL', field: 'priority' },
    { name: 'Staff filters by a priority in lower case (high)', input: { priority: 'high' }, expected: 'FAIL', field: 'priority' },
    { name: 'Staff sends an empty priority filter', input: { priority: '' }, expected: 'FAIL', field: 'priority' },
    { name: 'Staff asks for 0 tickets', input: { limit: '0' }, expected: 'FAIL', field: 'limit' },
    {
      name: `Staff asks for ${SUPPORT_TICKETS_MAX_LIMIT + 1} tickets, one over the maximum`,
      input: { limit: String(SUPPORT_TICKETS_MAX_LIMIT + 1) },
      expected: 'FAIL',
      field: 'limit',
    },
    { name: 'Staff asks for a negative number of tickets', input: { limit: '-1' }, expected: 'FAIL', field: 'limit' },
    { name: 'Staff asks for a fractional number of tickets', input: { limit: '1.5' }, expected: 'FAIL', field: 'limit' },
    { name: 'Staff types the limit as a word (ten)', input: { limit: 'ten' }, expected: 'FAIL', field: 'limit' },
    { name: 'Staff sends an empty limit', input: { limit: '' }, expected: 'FAIL', field: 'limit' },
    { name: 'Client sends a query parameter the list does not take (page)', input: { page: '2' }, expected: 'FAIL' },
  ];

  describe('support tickets site — List field validation', () => {
    const ctx = useSupportTicketsApp();

    describe('GET /api/v1/support-tickets', () => {
      describe('query', () => describeListQueryTable(ctx, queryFixtures));
    });
  });
}

/* ── Update ticket ───────────────────────────────────────────────────────── */
{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Staff saves without changing anything', input: {}, expected: 'FAIL', field: '', message: MESSAGES.nothingToUpdate },
    { name: 'Staff moves the ticket to a status in lower case (resolved)', input: { status: 'resolved' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff moves the ticket to a status that does not exist (DONE)', input: { status: 'DONE' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff sends an empty status', input: { status: '' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff sends "all" as the status (a list filter, not a status)', input: { status: 'all' }, expected: 'FAIL', field: 'status' },
    { name: 'Staff adds an empty note', input: { note: '' }, expected: 'FAIL', field: 'note' },
    { name: 'Staff adds a note of only spaces and line breaks', input: { note: '   \n  ' }, expected: 'FAIL', field: 'note' },
    { name: 'Staff adds a note of 2001 characters', input: { note: 'a'.repeat(2001) }, expected: 'FAIL', field: 'note' },
    { name: 'Staff assigns the ticket to an id that is not a uuid', input: { assignee_id: 'grace' }, expected: 'FAIL', field: 'assignee_id' },
    { name: 'Staff assigns the ticket to an empty id', input: { assignee_id: '' }, expected: 'FAIL', field: 'assignee_id' },
    { name: 'Staff assigns the ticket to a user number instead of a uuid', input: { assignee_id: '42' }, expected: 'FAIL', field: 'assignee_id' },
    { name: 'Staff tries to change the priority, which Update does not take', input: { priority: 'HIGH' }, expected: 'FAIL' },
    { name: 'Staff tries to edit the subject, which Update does not take', input: { status: 'IN_PROGRESS', subject: 'Renamed' }, expected: 'FAIL' },
    { name: 'Staff sends a valid status alongside an invalid note', input: { status: 'RESOLVED', note: '' }, expected: 'FAIL', field: 'note' },
    // A note is stored and shown to the requester exactly like a reply, so it is held to the reply's rule.
    {
      name: 'Staff pastes a non-printing character (bell) into the note',
      input: { note: `${VALID_NOTE}\u0007` },
      expected: 'FAIL',
      field: 'note',
    },
  ];

  describe('support tickets site — Update field validation', () => {
    const ctx = useSupportTicketsApp();

    describe('PATCH /api/v1/support-tickets/:id', () => {
      describe('id', () => describeTicketIdTable(ctx, 'updates', ticketIdFixtures('updates')));

      describe('id', () => {
        asCase('invalid', 'Staff updates a well-formed id that belongs to no ticket', `Update fails with "${MESSAGES.ticketNotFound}" (404); nothing is written`).it(
          'refuses an unknown ticket',
          async () => {
            ctx.repository.findTicket.mockResolvedValue(null as never);
            const outcome = await updateTicket(ctx, { status: 'IN_PROGRESS', note: VALID_NOTE });
            expectRefusal(outcome, 404, MESSAGES.ticketNotFound);
            expectNothingWritten(ctx);
          },
        );
      });

    });
  });
}

/* ── Reply to ticket ─────────────────────────────────────────────────────── */
{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Staff sends a reply with the body left out', input: {}, expected: 'FAIL', field: 'body' },
    { name: 'Staff sends an empty reply', input: { body: '' }, expected: 'FAIL', field: 'body' },
    { name: 'Staff sends a reply of only spaces and line breaks', input: { body: '   \r\n\t  ' }, expected: 'FAIL', field: 'body' },
    { name: 'Staff types a reply of 2001 characters', input: { body: 'a'.repeat(2001) }, expected: 'FAIL', field: 'body' },
    {
      name: 'Staff pastes a form-feed character into the reply',
      input: { body: 'Page one\u000Cpage two' },
      expected: 'FAIL',
      field: 'body',
      message: MESSAGES.controlCharacters,
    },
    {
      name: 'Staff pastes a delete character into the reply',
      input: { body: 'Typo\u007F' },
      expected: 'FAIL',
      field: 'body',
      message: MESSAGES.controlCharacters,
    },
    { name: 'Staff sends the reply under "message" instead of "body"', input: { message: VALID_REPLY.body }, expected: 'FAIL', field: 'body' },
    { name: 'Client sends a field the reply does not take (status)', input: { ...VALID_REPLY, status: 'RESOLVED' }, expected: 'FAIL' },
  ];

  describe('support tickets site — Reply field validation', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      describe('id', () => describeTicketIdTable(ctx, 'reply', ticketIdFixtures('replies on')));

      describe('id', () => {
        asCase('invalid', 'Staff replies on a well-formed id that belongs to no ticket', `Reply fails with "${MESSAGES.ticketNotFound}" (404); nothing is written`).it(
          'refuses an unknown ticket',
          async () => {
            ctx.repository.findTicket.mockResolvedValue(null as never);
            const outcome = await replyToTicket(ctx, VALID_REPLY);
            expectRefusal(outcome, 404, MESSAGES.ticketNotFound);
            expectNothingWritten(ctx);
          },
        );
      });

      describe('body', () => describeReplyBodyTable(ctx, bodyFixtures));
    });
  });
}
