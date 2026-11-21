import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  LoginSource,
  RoleType,
  SupportTicketAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../../../src/infastructures/prisma/common/client';
import { SupportTicketsSiteController } from '../../../../src/modules/support-tickets/controllers/support-tickets-site-controller';
import {
  SupportTicketsRepository,
  type UpdateSupportTicketInput,
} from '../../../../src/modules/support-tickets/repositories/support-tickets-repository';
import { SupportTicketsSiteService } from '../../../../src/modules/support-tickets/services/support-tickets-site-service';
import {
  ListSupportTicketsQuerySchema,
  ReplyToSupportTicketSchema,
  SUPPORT_TICKETS_DEFAULT_LIMIT,
  SUPPORT_TICKETS_MAX_LIMIT,
  UpdateSupportTicketSchema,
} from '../../../../src/modules/support-tickets/validators/support-tickets-site-validator';
import { NotificationScheduler } from '../../../../src/schedulers/jobs/notification-scheduler';
import {
  LayerFixture,
  LayerOutcome,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectSafeErrorEnvelope,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Support Tickets Module', unit: 'List / Update / Reply to Ticket', prefix: 'TICKET' });

/**
 * Shared by every spec in this folder — field validation for the portal Support
 * Tickets queue:
 *
 *   GET   /api/v1/support-tickets              List    status · type · priority · limit (query)
 *   PATCH /api/v1/support-tickets/:id          Update  id (uuid) · status · note · assignee_id
 *   POST  /api/v1/support-tickets/:id/replies  Reply   id (uuid) · body
 *
 * The app runs the REAL `SupportTicketsSiteController` and
 * `SupportTicketsSiteService`, so the 404 for an unknown ticket and what is written
 * for a note or reply come from production code. Only `SupportTicketsRepository`
 * (Prisma) and `NotificationScheduler` are mocked.
 *
 * The ticket-id schema is a private const in the controller, so id cases run
 * through the API layer only.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix).
 */
export const CALLER = {
  sub: '0f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
  email: 'admin@cares.ph',
  role_type: RoleType.ADMIN,
};
export const STAFF_NAME = 'Grace Hopper';
export const VALID_TICKET_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const VALID_ASSIGNEE_ID = '7c6b5a49-3827-4615-9a4b-3c2d1e0f9a8b';
const CREATED_AT = new Date('2026-10-30T08:00:00.000Z');

export const LIST_PATH = '/api/v1/support-tickets';
export const ticketPath = (id: string) => `/api/v1/support-tickets/${encodeURIComponent(id)}`;
export const replyPath = (id: string) => `${ticketPath(id)}/replies`;

export const VALID_REPLY = { body: 'Thanks for the report. We are looking into it now.' };
export const VALID_NOTE = 'Reproduced on Android 14; a fix is being prepared.';

export const STATUSES = Object.values(SupportTicketStatus);
export const TYPES = Object.values(SupportTicketType);
export const PRIORITIES = Object.values(SupportTicketPriority);
export { SUPPORT_TICKETS_DEFAULT_LIMIT, SUPPORT_TICKETS_MAX_LIMIT };

/** Exact refusals the real code sends. */
export const MESSAGES = {
  ticketId: 'A valid support ticket id is required',
  nothingToUpdate: 'Nothing to update',
  controlCharacters: 'Reply cannot contain control characters',
  ticketNotFound: 'Support ticket not found',
};

/** A ticket as `SupportTicketsRepository.findTicket` returns it. */
export const storedTicket = (overrides: Record<string, unknown> = {}) => ({
  support_ticket_id: VALID_TICKET_ID,
  reference_number: 10,
  subject: 'Cannot open my certificate',
  description: 'The download link returns an error.',
  type: SupportTicketType.BUG,
  status: SupportTicketStatus.OPEN,
  priority: SupportTicketPriority.MEDIUM,
  requester_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  requester: {
    firstname: 'Ada',
    lastname: 'Lovelace',
    accounts: [{ email: 'ada@cares.ph' }],
    role: { type: RoleType.VOLUNTEER },
  },
  assignee_id: null as string | null,
  assignee: null as { firstname: string; lastname: string } | null,
  source: LoginSource.MOBILE,
  replies: [] as unknown[],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
});

/** What `updateTicket` would return after applying `data` to the stored ticket. */
const applyUpdate = (data: UpdateSupportTicketInput) => {
  const ticket = storedTicket();
  return {
    ...ticket,
    status: data.status ?? ticket.status,
    assignee_id: data.assigneeId === undefined ? ticket.assignee_id : data.assigneeId,
    assignee: data.assigneeId ? { firstname: 'Linus', lastname: 'Torvalds' } : null,
    replies: data.note
      ? [
          {
            support_ticket_reply_id: 'reply-1',
            author_id: data.note.authorId,
            author_name: data.note.authorName,
            author_type: data.note.authorType,
            body: data.note.body,
            createdAt: CREATED_AT,
          },
        ]
      : [],
  };
};

/* ───────────────────────────── app ───────────────────────────── */

/**
 * Boots the support tickets controller on the real service for the enclosing
 * `describe`. A stand-in for the global JWT guard puts `CALLER` on the request.
 * Before each test every mock goes back to the happy default: an OPEN ticket
 * exists, the caller's name resolves, writes and notifications succeed.
 */
export const useSupportTicketsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    repository: autoMock<SupportTicketsRepository>(),
    notifications: autoMock<NotificationScheduler>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [SupportTicketsSiteController],
      providers: [
        SupportTicketsSiteService,
        { provide: SupportTicketsRepository, useValue: ctx.repository },
        { provide: NotificationScheduler, useValue: ctx.notifications },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: ExecutionContext) => {
              context.switchToHttp().getRequest().user = CALLER;
              return true;
            },
          },
        },
      ],
    });
  });
  afterAll(() => ctx.app.close());

  beforeEach(() => {
    ctx.repository.listTickets.mockReset().mockResolvedValue({ rows: [storedTicket()], total: 1 } as never);
    ctx.repository.findTicket.mockReset().mockResolvedValue(storedTicket() as never);
    ctx.repository.findUserName.mockReset().mockResolvedValue(STAFF_NAME as never);
    ctx.repository.updateTicket
      .mockReset()
      .mockImplementation((async (_id: string, data: UpdateSupportTicketInput) => applyUpdate(data)) as never);
    ctx.notifications.publish.mockReset().mockResolvedValue(undefined as never);
  });

  return ctx;
};

export type TicketsCtx = ReturnType<typeof useSupportTicketsApp>;

/* ───────────────────────────── requests ───────────────────────────── */

export const listTickets = (ctx: TicketsCtx, query?: Record<string, string>) =>
  runApiLayer(ctx.app, { method: 'get', path: LIST_PATH, query });

export const updateTicket = (ctx: TicketsCtx, body: unknown, id = VALID_TICKET_ID) =>
  runApiLayer(ctx.app, { method: 'patch', path: ticketPath(id), body });

export const replyToTicket = (ctx: TicketsCtx, body: unknown, id = VALID_TICKET_ID) =>
  runApiLayer(ctx.app, { method: 'post', path: replyPath(id), body });

/* ───────────────────────────── shared checks ───────────────────────────── */

/** A refusal from the service: exact status + message in the `{ ok: false }` envelope. */
export const expectRefusal = (outcome: LayerOutcome, status: number, message: string) => {
  expect(outcome.status).toBe(status);
  expectSafeErrorEnvelope(outcome);
  expect(outcome.body.message).toBe(message);
};

/** A refused update or reply wrote nothing and told no one. */
export const expectNothingWritten = (ctx: TicketsCtx) => {
  expect(ctx.repository.updateTicket).not.toHaveBeenCalled();
  expect(ctx.notifications.publish).not.toHaveBeenCalled();
};

/** The single write the update or reply made. */
export const writtenUpdate = (ctx: TicketsCtx): UpdateSupportTicketInput => {
  expect(ctx.repository.updateTicket).toHaveBeenCalledTimes(1);
  const [id, data] = ctx.repository.updateTicket.mock.calls[0] as unknown as [string, UpdateSupportTicketInput];
  expect(id).toBe(VALID_TICKET_ID);
  return data;
};

/** The staff note a write carries, authored by the caller. */
export const staffNote = (body: string) => ({
  authorId: CALLER.sub,
  authorName: STAFF_NAME,
  authorType: SupportTicketAuthorType.STAFF,
  body,
});

/* ───────────────────────────── fixture tables ───────────────────────────── */

/**
 * List query fixtures (the fixture `input` is the query string as sent) through
 * both layers. A FAIL must come back in the validation envelope without a
 * database read; a PASS must read the queue once.
 */
export const describeListQueryTable = (ctx: TicketsCtx, fixtures: LayerFixture<Record<string, string>>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(ListSupportTicketsQuerySchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await listTickets(ctx, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.repository.listTickets).not.toHaveBeenCalled();
      } else {
        expect(outcome.status).toBe(200);
        expect(ctx.repository.listTickets).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/**
 * Update body fixtures through both layers against an existing ticket. A FAIL must
 * come back in the validation envelope without the ticket being read or written;
 * a PASS must write it once.
 */
export const describeUpdateBodyTable = (ctx: TicketsCtx, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(UpdateSupportTicketSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await updateTicket(ctx, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.repository.findTicket).not.toHaveBeenCalled();
        expectNothingWritten(ctx);
      } else {
        expect(outcome.status).toBe(200);
        expect(ctx.repository.updateTicket).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/**
 * Reply body fixtures through both layers against an existing ticket. A FAIL must
 * come back in the validation envelope without the ticket being read or written;
 * a PASS must write it once.
 */
export const describeReplyBodyTable = (ctx: TicketsCtx, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(ReplyToSupportTicketSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await replyToTicket(ctx, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.repository.findTicket).not.toHaveBeenCalled();
        expectNothingWritten(ctx);
      } else {
        expect(outcome.status).toBe(201);
        expect(ctx.repository.updateTicket).toHaveBeenCalledTimes(1);
      }
    });
  });
};

export type TicketRoute = 'update' | 'reply';

/**
 * Ticket-id fixtures (the fixture `input` is the raw id, URL-encoded into the path)
 * through the API layer, with a valid body so the id is the only thing under test.
 * A FAIL must name the ticket-id rule and never read or write the ticket.
 */
export const describeTicketIdTable = (ctx: TicketsCtx, route: TicketRoute, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome =
        route === 'update'
          ? await updateTicket(ctx, { status: SupportTicketStatus.IN_PROGRESS }, fixture.input)
          : await replyToTicket(ctx, VALID_REPLY, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(outcome.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ message: MESSAGES.ticketId })]),
        );
        expect(ctx.repository.findTicket).not.toHaveBeenCalled();
        expectNothingWritten(ctx);
      } else {
        expect(ctx.repository.updateTicket).toHaveBeenCalledTimes(1);
      }
    });
  });
};
