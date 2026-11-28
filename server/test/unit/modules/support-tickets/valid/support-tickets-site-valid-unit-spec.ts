import {
  ListSupportTicketsQuerySchema,
  UpdateSupportTicketSchema,
} from '../../../../../src/modules/support-tickets/validators/support-tickets-site-validator';
import { LayerFixture, runSchemaLayer } from '../../../../config/layer-harness';
import { asCase } from '../../../../config/test-case';
import {
  PRIORITIES,
  STATUSES,
  SUPPORT_TICKETS_MAX_LIMIT,
  TYPES,
  VALID_ASSIGNEE_ID,
  VALID_NOTE,
  VALID_REPLY,
  VALID_TICKET_ID,
  describeListQueryTable,
  describeReplyBodyTable,
  describeTicketIdTable,
  describeUpdateBodyTable,
  listTickets,
  replyToTicket,
  staffNote,
  updateTicket,
  useSupportTicketsApp,
  writtenUpdate,
} from '../support-tickets-site-support';

{
  const queryFixtures: LayerFixture<Record<string, string>>[] = [
    { name: 'Staff opens the ticket queue with no filters', input: {}, expected: 'PASS' },
    { name: 'Staff picks "All" for status, type and priority', input: { status: 'all', type: 'all', priority: 'all' }, expected: 'PASS' },
    { name: 'Staff limits the list to 1 ticket', input: { limit: '1' }, expected: 'PASS' },
    {
      name: `Staff asks for the maximum of ${SUPPORT_TICKETS_MAX_LIMIT} tickets`,
      input: { limit: String(SUPPORT_TICKETS_MAX_LIMIT) },
      expected: 'PASS',
    },
    {
      name: 'Staff combines a status, type, priority and limit filter',
      input: { status: 'IN_PROGRESS', type: 'BUG', priority: 'HIGH', limit: '50' },
      expected: 'PASS',
    },
  ];

  describe('support tickets site — List field validation', () => {
    const ctx = useSupportTicketsApp();

    describe('GET /api/v1/support-tickets', () => {
      describe('query', () => describeListQueryTable(ctx, queryFixtures));

      describe('status', () => {
        asCase('valid', `Staff filters the queue by each ticket status (${STATUSES.length} variants)`, 'Queue listed (200) with only that status requested').it.each(
          STATUSES,
        )('accepts %s', async (status) => {
          expect((await runSchemaLayer(ListSupportTicketsQuerySchema, { status })).verdict).toBe('PASS');
          const outcome = await listTickets(ctx, { status });
          expect(outcome.status).toBe(200);
          expect(ctx.repository.listTickets).toHaveBeenCalledWith(expect.objectContaining({ status }));
        });
      });

      describe('type', () => {
        asCase('valid', `Staff filters the queue by each ticket type (${TYPES.length} variants)`, 'Queue listed (200) with only that type requested').it.each(
          TYPES,
        )('accepts %s', async (type) => {
          expect((await runSchemaLayer(ListSupportTicketsQuerySchema, { type })).verdict).toBe('PASS');
          const outcome = await listTickets(ctx, { type });
          expect(outcome.status).toBe(200);
          expect(ctx.repository.listTickets).toHaveBeenCalledWith(expect.objectContaining({ type }));
        });
      });

      describe('priority', () => {
        asCase('valid', `Staff filters the queue by each priority (${PRIORITIES.length} variants)`, 'Queue listed (200) with only that priority requested').it.each(
          PRIORITIES,
        )('accepts %s', async (priority) => {
          expect((await runSchemaLayer(ListSupportTicketsQuerySchema, { priority })).verdict).toBe('PASS');
          const outcome = await listTickets(ctx, { priority });
          expect(outcome.status).toBe(200);
          expect(ctx.repository.listTickets).toHaveBeenCalledWith(expect.objectContaining({ priority }));
        });
      });
    });
  });
}

{
  const idFixtures: LayerFixture<string>[] = [
    { name: 'Staff updates a ticket by its id', input: VALID_TICKET_ID, expected: 'PASS' },
    { name: 'Staff updates a ticket whose id is in upper case', input: VALID_TICKET_ID.toUpperCase(), expected: 'PASS' },
  ];

  const bodyFixtures: LayerFixture[] = [
    { name: 'Staff changes only the status', input: { status: 'RESOLVED' }, expected: 'PASS' },
    { name: 'Staff adds only a note', input: { note: VALID_NOTE }, expected: 'PASS' },
    { name: 'Staff only assigns the ticket to a colleague', input: { assignee_id: VALID_ASSIGNEE_ID }, expected: 'PASS' },
    { name: 'Staff only unassigns the ticket', input: { assignee_id: null }, expected: 'PASS' },
    {
      name: 'Staff changes the status, adds a note and assigns the ticket together',
      input: { status: 'UNDER_VERIFICATION', note: VALID_NOTE, assignee_id: VALID_ASSIGNEE_ID },
      expected: 'PASS',
    },
    { name: 'Staff adds a one-character note', input: { note: 'k' }, expected: 'PASS' },
    { name: 'Staff adds a note of exactly 2000 characters', input: { note: 'a'.repeat(2000) }, expected: 'PASS' },
    { name: 'Staff adds a note over several lines', input: { note: 'Steps tried:\n1. Cleared cache\n2. Reinstalled' }, expected: 'PASS' },
    { name: 'Staff adds a note with accents, emoji and quotes', input: { note: `Señora's "download" works now 🙏` }, expected: 'PASS' },
  ];

  describe('support tickets site — Update field validation', () => {
    const ctx = useSupportTicketsApp();

    describe('PATCH /api/v1/support-tickets/:id', () => {
      describe('id', () => describeTicketIdTable(ctx, 'update', idFixtures));
      describe('body', () => describeUpdateBodyTable(ctx, bodyFixtures));

      describe('status', () => {
        asCase('valid', `Staff moves the ticket to each status (${STATUSES.length} variants)`, 'Ticket updated (200) and saved with that status').it.each(
          STATUSES,
        )('accepts %s', async (status) => {
          expect((await runSchemaLayer(UpdateSupportTicketSchema, { status })).verdict).toBe('PASS');
          const outcome = await updateTicket(ctx, { status });
          expect(outcome.status).toBe(200);
          expect(writtenUpdate(ctx).status).toBe(status);
          expect(outcome.body.data.status).toBe(status);
        });
      });

      describe('note', () => {
        asCase('valid', 'Staff adds a note to the ticket', 'Ticket updated (200); the note is saved as a staff reply authored by the caller').it(
          'saves the note as a staff reply',
          async () => {
            const outcome = await updateTicket(ctx, { note: VALID_NOTE });
            expect(outcome.status).toBe(200);
            expect(writtenUpdate(ctx).note).toEqual(staffNote(VALID_NOTE));
            expect(outcome.body.data.replies).toEqual([expect.objectContaining({ body: VALID_NOTE, author_type: 'STAFF' })]);
          },
        );
      });

      describe('assignee_id', () => {
        asCase('valid', 'Staff assigns the ticket to a colleague', 'Ticket updated (200) and saved with that assignee').it(
          'saves the assignee',
          async () => {
            const outcome = await updateTicket(ctx, { assignee_id: VALID_ASSIGNEE_ID });
            expect(outcome.status).toBe(200);
            expect(writtenUpdate(ctx).assigneeId).toBe(VALID_ASSIGNEE_ID);
            expect(outcome.body.data.assignee_id).toBe(VALID_ASSIGNEE_ID);
          },
        );

        asCase('valid', 'Staff unassigns the ticket', 'Ticket updated (200) and saved with no assignee').it(
          'clears the assignee',
          async () => {
            const outcome = await updateTicket(ctx, { assignee_id: null });
            expect(outcome.status).toBe(200);
            expect(writtenUpdate(ctx).assigneeId).toBeNull();
            expect(outcome.body.data.assignee_id).toBeNull();
          },
        );

        asCase('valid', 'Staff changes the status without touching the assignee', 'Ticket updated (200); the assignee is left as it was').it(
          'leaves the assignee untouched',
          async () => {
            const outcome = await updateTicket(ctx, { status: 'IN_PROGRESS' });
            expect(outcome.status).toBe(200);
            expect(writtenUpdate(ctx).assigneeId).toBeUndefined();
          },
        );
      });
    });
  });
}

{
  const idFixtures: LayerFixture<string>[] = [
    { name: 'Staff replies on a ticket by its id', input: VALID_TICKET_ID, expected: 'PASS' },
    { name: 'Staff replies on a ticket whose id is in upper case', input: VALID_TICKET_ID.toUpperCase(), expected: 'PASS' },
  ];

  const bodyFixtures: LayerFixture[] = [
    { name: 'Staff types a one-line reply', input: VALID_REPLY, expected: 'PASS' },
    { name: 'Staff types a one-character reply', input: { body: 'k' }, expected: 'PASS' },
    { name: 'Staff types a reply of exactly 2000 characters', input: { body: 'a'.repeat(2000) }, expected: 'PASS' },
    { name: 'Staff types a reply over several lines', input: { body: 'Line one\nLine two\r\n\r\nLine four' }, expected: 'PASS' },
    { name: 'Staff types a reply with tabs', input: { body: 'Step 1:\tReinstall the app' }, expected: 'PASS' },
    { name: 'Staff types a reply with accents and emoji', input: { body: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
    { name: 'Staff types a reply with punctuation and quotes', input: { body: `Can't reproduce — try "Settings > Storage" (Android 14)?` }, expected: 'PASS' },
  ];

  describe('support tickets site — Reply field validation', () => {
    const ctx = useSupportTicketsApp();

    describe('POST /api/v1/support-tickets/:id/replies', () => {
      describe('id', () => describeTicketIdTable(ctx, 'reply', idFixtures));
      describe('body', () => describeReplyBodyTable(ctx, bodyFixtures));

      describe('body', () => {
        asCase('valid', 'Staff sends a reply on a ticket', 'Reply sent (201); the reply is saved as a staff reply authored by the caller').it(
          'saves the reply as a staff reply',
          async () => {
            const outcome = await replyToTicket(ctx, VALID_REPLY);
            expect(outcome.status).toBe(201);
            expect(outcome.body.message).toBe('Reply sent');
            expect(writtenUpdate(ctx).note).toEqual(staffNote(VALID_REPLY.body));
            expect(outcome.body.data.replies).toEqual([expect.objectContaining({ body: VALID_REPLY.body, author_type: 'STAFF' })]);
          },
        );
      });
    });
  });
}
