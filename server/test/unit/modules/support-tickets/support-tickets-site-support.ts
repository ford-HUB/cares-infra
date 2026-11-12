import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  LoginSource,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../../../src/infastructures/prisma/common/client';
import { SupportTicketsSiteController } from '../../../../src/modules/support-tickets/controllers/support-tickets-site-controller';
import { SupportTicketsSiteService } from '../../../../src/modules/support-tickets/services/support-tickets-site-service';
import { ReplyToSupportTicketSchema } from '../../../../src/modules/support-tickets/validators/support-tickets-site-validator';
import {
  LayerFixture,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Support Tickets Module', unit: 'Reply to Ticket', prefix: 'TICKET' });

/**
 * Shared by every spec in this folder — the portal Support Tickets reply action:
 *   POST /api/v1/support-tickets/:id/replies  (replyToTicket: id uuid + ReplyToSupportTicketSchema)
 *
 * The id schema is a private const in the controller, so path-param fixtures
 * run through the API layer only.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_TICKET_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const CALLER = { sub: 'caller-user-id' };

export const replyPath = (id: string) => `/api/v1/support-tickets/${encodeURIComponent(id)}/replies`;

export const VALID_REPLY = { body: 'Thanks for the report. We are looking into it now.' };

export const TICKET_RESPONSE = {
  support_ticket_id: VALID_TICKET_ID,
  reference_number: 10,
  subject: 'Cannot open my certificate',
  description: 'The download link returns an error.',
  type: Object.values(SupportTicketType)[0],
  status: SupportTicketStatus.IN_PROGRESS,
  priority: Object.values(SupportTicketPriority)[0],
  requester_id: 'requester-user-id',
  requester_firstname: 'Ada',
  requester_lastname: 'Lovelace',
  requester_email: 'ada@cares.ph',
  requester_role_type: 'VOLUNTEER',
  assignee_id: null,
  assignee_name: null,
  source: LoginSource.MOBILE,
  replies: [],
  created_at: '2026-10-30T08:00:00.000Z',
  updated_at: '2026-10-30T08:00:00.000Z',
};

/**
 * Boots `SupportTicketsSiteController` with a mocked service for the enclosing
 * `describe`. The controller reads `user.sub`, so a stand-in for the global JWT
 * guard puts `CALLER` on the request. Read `app` inside tests — it is assigned
 * in `beforeAll`.
 */
export const useSupportTicketsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<SupportTicketsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [SupportTicketsSiteController],
      providers: [
        { provide: SupportTicketsSiteService, useValue: ctx.service },
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
    ctx.service.replyToTicket.mockReset().mockResolvedValue(TICKET_RESPONSE as never);
  });

  return ctx;
};

/**
 * Reply body fixtures through both layers, against a valid ticket id. A FAIL must
 * come back in the validation envelope without reaching the service; a PASS must
 * reach it exactly once.
 */
export const describeReplyBodyTable = (ctx: ReturnType<typeof useSupportTicketsApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(ReplyToSupportTicketSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: replyPath(VALID_TICKET_ID),
        body: fixture.input,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.replyToTicket).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.replyToTicket).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/**
 * Ticket id fixtures (the fixture `input` is the raw id, URL-encoded into the
 * path) through the API layer, with a valid body so the id is the only thing
 * under test.
 */
export const describeTicketIdTable = (
  ctx: ReturnType<typeof useSupportTicketsApp>,
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: replyPath(fixture.input),
        body: VALID_REPLY,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.replyToTicket).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.replyToTicket).toHaveBeenCalledTimes(1);
      }
    });
  });
};
