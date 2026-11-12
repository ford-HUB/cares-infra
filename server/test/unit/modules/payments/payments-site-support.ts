import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  DonationPaymentMethod,
  PaymentAccountProof,
  PaymentGatewayMode,
  PaymentMethodVerification,
} from '../../../../src/infastructures/prisma/common/client';
import { PaymentsSiteController } from '../../../../src/modules/payments/controllers/payments-site-controller';
import { PaymentsSiteService } from '../../../../src/modules/payments/services/payments-site-service';
import {
  ConfirmAccountProofSchema,
  PaymentMethodParamSchema,
  TestPaymentGatewaySchema,
} from '../../../../src/modules/payments/validators/payments-site-validator';
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

setCaseUnit({ module: 'Payments Module', unit: 'Payment Gateway Settings', prefix: 'PAY' });

/**
 * Shared by every spec in this folder — the four POSTs on the portal's Payments module:
 *   POST /api/v1/payments/settings/methods/:method/verify                (verifyMethod)
 *   POST /api/v1/payments/settings/methods/:method/account-proof         (startAccountProof)
 *   POST /api/v1/payments/settings/methods/:method/account-proof/confirm (confirmAccountProof + ConfirmAccountProofSchema)
 *   POST /api/v1/payments/settings/test                                  (testConnection + TestPaymentGatewaySchema)
 *
 * `@Roles` and `@RequirePermission` are not exercised: the global guards are out of
 * scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_METHOD = DonationPaymentMethod.GCASH;
export const CALLER = { sub: 'caller-user-id' };

export const VALID_CONFIRM = { amount: 7 };
export const VALID_TEST = {
  secret_key: 'xnd_development_abcdefghijklmnopqrstuvwxyz',
  api_url: 'https://api.xendit.co',
};

const methodPath = (method: string, action: string) =>
  `/api/v1/payments/settings/methods/${encodeURIComponent(method)}/${action}`;

export const VERIFY_ENDPOINT = {
  title: 'POST /api/v1/payments/settings/methods/:method/verify',
  path: (method: string = VALID_METHOD) => methodPath(method, 'verify'),
  handler: 'verifyMethod',
  message: 'Payment method checked',
  validBody: undefined,
} as const;
export const PROOF_ENDPOINT = {
  title: 'POST /api/v1/payments/settings/methods/:method/account-proof',
  path: (method: string = VALID_METHOD) => methodPath(method, 'account-proof'),
  handler: 'startAccountProof',
  message: 'Test payout sent',
  validBody: undefined,
} as const;
export const CONFIRM_ENDPOINT = {
  title: 'POST /api/v1/payments/settings/methods/:method/account-proof/confirm',
  path: (method: string = VALID_METHOD) => methodPath(method, 'account-proof/confirm'),
  handler: 'confirmAccountProof',
  message: 'Account proof checked',
  schema: ConfirmAccountProofSchema,
  validBody: VALID_CONFIRM,
} as const;
export const TEST_ENDPOINT = {
  title: 'POST /api/v1/payments/settings/test',
  path: () => '/api/v1/payments/settings/test',
  handler: 'testConnection',
  message: 'Payment gateway tested',
  schema: TestPaymentGatewaySchema,
  validBody: VALID_TEST,
} as const;

/** The endpoints that take `:method`. */
export const METHOD_ENDPOINTS = [VERIFY_ENDPOINT, PROOF_ENDPOINT, CONFIRM_ENDPOINT];
export const BODY_ENDPOINTS = [CONFIRM_ENDPOINT, TEST_ENDPOINT];
export const ENDPOINTS = [VERIFY_ENDPOINT, PROOF_ENDPOINT, CONFIRM_ENDPOINT, TEST_ENDPOINT];

export const SETTINGS_RESPONSE = {
  mode: PaymentGatewayMode.TEST,
  enabled: true,
  secret_key_set: true,
  secret_key_last4: 'wxyz',
  webhook_token_set: true,
  using_env_credentials: false,
  api_url: null,
  statement_name: 'CARES',
  support_email: 'support@cares.ph',
  support_contact: null,
  webhook_url: 'https://api.cares.ph/api/v1/donations/webhooks/xendit',
  verified_at: '2026-10-30T08:00:00.000Z',
  verification_error: null,
  methods: [
    {
      method: VALID_METHOD,
      enabled: true,
      default_label: 'GCash',
      display_name: null,
      instructions: null,
      account_name: 'CARES Foundation',
      account_number: '09171234567',
      channel_codes: [],
      available_channel_codes: ['GCASH'],
      min_amount: 0,
      max_amount: 0,
      sort_order: 1,
      verification: PaymentMethodVerification.VERIFIED,
      verified_at: '2026-10-30T08:00:00.000Z',
      verification_message: null,
      verified_channel_codes: ['GCASH'],
      callbacks_registered_at: '2026-10-30T08:00:00.000Z',
      account_proof: PaymentAccountProof.AWAITING_CONFIRMATION,
      account_proof_message: null,
      account_proof_sent_at: '2026-10-30T08:00:00.000Z',
      account_proof_attempts: 0,
      account_verified_at: null,
      account_proof_sandbox_amount: null,
    },
  ],
  amount_floor: 1,
  amount_ceiling: 500000,
  updated_by_user_id: CALLER.sub,
  updated_at: '2026-10-30T08:00:00.000Z',
};

/**
 * Boots `PaymentsSiteController` with a mocked service for the enclosing `describe`.
 * The controller passes the caller through, so a stand-in for the global JWT guard
 * puts `CALLER` on the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const usePaymentsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<PaymentsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [PaymentsSiteController],
      providers: [
        { provide: PaymentsSiteService, useValue: ctx.service },
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
      ctx.service[handler].mockReset().mockResolvedValue(SETTINGS_RESPONSE as never);
    }
  });

  return ctx;
};

/**
 * `:method` fixtures (the fixture `input` is the raw value, URL-encoded into the path)
 * through both layers, with a valid body where the endpoint reads one so the param is
 * the only thing under test. A FAIL must come back in the validation envelope without
 * reaching the service; a PASS must reach it exactly once.
 */
export const describeMethodTable = (
  ctx: ReturnType<typeof usePaymentsApp>,
  endpoint: (typeof METHOD_ENDPOINTS)[number],
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(PaymentMethodParamSchema, fixture.input), fixture);
    });

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

/** Body fixtures through both layers, against a valid `:method` where the endpoint has one. */
export const describeBodyTable = (
  ctx: ReturnType<typeof usePaymentsApp>,
  endpoint: (typeof BODY_ENDPOINTS)[number],
  fixtures: LayerFixture[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(endpoint.schema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(),
        body: fixture.input,
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
