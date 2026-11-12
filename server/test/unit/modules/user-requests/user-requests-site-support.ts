import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  RoleType,
  UserRequestKind,
  UserRequestStatus,
} from '../../../../src/infastructures/prisma/common/client';
import { UserRequestsSiteController } from '../../../../src/modules/user-requests/controllers/user-requests-site-controller';
import { UserRequestsSiteService } from '../../../../src/modules/user-requests/services/user-requests-site-service';
import { RejectUserRequestSchema } from '../../../../src/modules/user-requests/validators/user-requests-site-validator';
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

setCaseUnit({ module: 'Users Module', unit: 'User Request Decision', prefix: 'USER-REQ' });

/**
 * Shared by every spec in this folder — the four POSTs on Users → Request in the portal:
 *   POST /api/v1/user-requests/:id/accept   (accept: id uuid)
 *   POST /api/v1/user-requests/:id/reject   (reject: id uuid + RejectUserRequestSchema)
 *   POST /api/v1/user-requests/:id/remove   (remove: id uuid)
 *   POST /api/v1/user-requests/:id/restore  (restore: id uuid)
 *
 * The id schema is a private const in the controller, so path-param fixtures run
 * through the API layer only. `@Roles` and `@RequirePermission` are not exercised:
 * the global guards are out of scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_REQUEST_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const CALLER = { sub: 'caller-user-id' };

export const VALID_REJECT = { reason: 'The uploaded ID is not readable.' };

const requestPath = (id: string, action: string) =>
  `/api/v1/user-requests/${encodeURIComponent(id)}/${action}`;

export const ACCEPT_ENDPOINT = {
  title: 'POST /api/v1/user-requests/:id/accept',
  path: (id: string = VALID_REQUEST_ID) => requestPath(id, 'accept'),
  handler: 'accept',
  message: 'Request accepted',
  validBody: undefined,
} as const;
export const REJECT_ENDPOINT = {
  title: 'POST /api/v1/user-requests/:id/reject',
  path: (id: string = VALID_REQUEST_ID) => requestPath(id, 'reject'),
  handler: 'reject',
  message: 'Request rejected',
  validBody: VALID_REJECT,
} as const;
export const REMOVE_ENDPOINT = {
  title: 'POST /api/v1/user-requests/:id/remove',
  path: (id: string = VALID_REQUEST_ID) => requestPath(id, 'remove'),
  handler: 'remove',
  message: 'Request removed',
  validBody: undefined,
} as const;
export const RESTORE_ENDPOINT = {
  title: 'POST /api/v1/user-requests/:id/restore',
  path: (id: string = VALID_REQUEST_ID) => requestPath(id, 'restore'),
  handler: 'restore',
  message: 'Request restored',
  validBody: undefined,
} as const;

/** The actions that read nothing but the id. */
export const BODYLESS_ENDPOINTS = [ACCEPT_ENDPOINT, REMOVE_ENDPOINT, RESTORE_ENDPOINT];
export const ENDPOINTS = [ACCEPT_ENDPOINT, REJECT_ENDPOINT, REMOVE_ENDPOINT, RESTORE_ENDPOINT];

export const REQUEST_RESPONSE = {
  user_request_id: VALID_REQUEST_ID,
  reference_number: 10,
  kind: UserRequestKind.BENEFICIARY_REGISTRATION,
  status: UserRequestStatus.PENDING,
  requester_id: 'requester-user-id',
  requester_firstname: 'Ada',
  requester_lastname: 'Lovelace',
  requester_email: 'ada@cares.ph',
  requester_role_type: RoleType.BENEFICIARY,
  requester_barangay: 'Lahug',
  requester_phone: '09171234567',
  requester_address: '12 Gorordo Avenue, Cebu City',
  requested_role: null,
  participation_role: null,
  event_id: null,
  event_title: null,
  event_started: null,
  summary: 'Beneficiary registration',
  face_similarity: 0.91,
  attachments: [
    { kind: 'id-front', label: 'ID (front)', content_type: 'image/jpeg', file_name: null, size_bytes: 2048 },
  ],
  decided_by_name: null,
  decided_at: null,
  rejection_reason: null,
  trail: [
    {
      user_request_trail_entry_id: 'trail-entry-id',
      label: 'Request submitted',
      actor_name: 'Ada Lovelace',
      created_at: '2026-10-30T08:00:00.000Z',
    },
  ],
  created_at: '2026-10-30T08:00:00.000Z',
  updated_at: '2026-10-30T08:00:00.000Z',
};

/**
 * Boots `UserRequestsSiteController` with a mocked service for the enclosing `describe`.
 * The handlers read `user.sub`, so a stand-in for the global JWT guard puts `CALLER` on
 * the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useUserRequestsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<UserRequestsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [UserRequestsSiteController],
      providers: [
        { provide: UserRequestsSiteService, useValue: ctx.service },
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
    for (const { handler } of ENDPOINTS) {
      ctx.service[handler].mockReset().mockResolvedValue(REQUEST_RESPONSE as never);
    }
  });

  return ctx;
};

/**
 * Request id fixtures (the fixture `input` is the raw id, URL-encoded into the path)
 * through the API layer, with a valid body where the action reads one so the id is the
 * only thing under test. A FAIL must come back in the validation envelope without
 * reaching the service; a PASS must reach it exactly once.
 */
export const describeRequestIdTable = (
  ctx: ReturnType<typeof useUserRequestsApp>,
  endpoint: (typeof ENDPOINTS)[number],
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(fixture.input),
        body: endpoint.validBody,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      } else {
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/** Reject body fixtures through both layers, against a valid request id. */
export const describeRejectBodyTable = (ctx: ReturnType<typeof useUserRequestsApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(RejectUserRequestSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: REJECT_ENDPOINT.path(),
        body: fixture.input,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.reject).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.reject).toHaveBeenCalledTimes(1);
      }
    });
  });
};
