import { asCase } from '../../../../config/test-case';
import { BadRequestException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  autoMock,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  CONFIRM_ENDPOINT,
  ENDPOINTS,
  PROOF_ENDPOINT,
  usePaymentsApp,
  METHOD_ENDPOINTS,
  TEST_ENDPOINT,
  VALID_CONFIRM,
  VALID_METHOD,
  VALID_TEST,
  describeBodyTable,
  describeMethodTable,
  CALLER,
  VERIFY_ENDPOINT,
  BODY_ENDPOINTS,
} from '../payments-site-support';
import { DonationPaymentMethod } from '../../../../../src/infastructures/prisma/common/client';
import { SECRET_KEY_MAX, SECRET_KEY_MIN, UpdatePaymentSettingsSchema } from '../../../../../src/modules/payments/validators/payments-site-validator';
import { PaymentsSiteService } from '../../../../../src/modules/payments/services/payments-site-service';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SSRF_URL_PAYLOADS,
} from '../../../../config/security-payloads';

/**
 * Payments Module · Payment Gateway Settings — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Payments POST actions — error handling: unexpected service errors and a response the
   * serializer refuses are masked as a generic 500 with nothing leaked, and the service's
   * deliberate HttpExceptions keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    {
      title: 'account-proof · 400 for an account that fails its check',
      endpoint: PROOF_ENDPOINT,
      error: new BadRequestException('That is not a Philippine mobile number — a GCash account is 11 digits, e.g. 09171234567.'),
    },
    {
      title: 'account-proof · 400 for a channel with no payout route',
      endpoint: PROOF_ENDPOINT,
      error: new BadRequestException('CARES cannot send a test payout to a Card account.'),
    },
    {
      title: 'confirm · 400 for a channel that is not set up',
      endpoint: CONFIRM_ENDPOINT,
      error: new BadRequestException('That payment method is not set up yet'),
    },
    {
      title: 'confirm · 400 when no payout is waiting',
      endpoint: CONFIRM_ENDPOINT,
      error: new BadRequestException('There is no test payout waiting to be confirmed. Send one first.'),
    },
  ];

  describe('payments site · POST actions — error handling', () => {
    const ctx = usePaymentsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      const send = () =>
        runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.validBody });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service[endpoint.handler].mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await send();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service[endpoint.handler].mockResolvedValueOnce({ secret_key_cipher: 'stored-key-cipher' } as never);
        const outcome = await send();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });
    });

    asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ endpoint, error }) => {
      ctx.service[endpoint.handler].mockRejectedValueOnce(error as never);
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.validBody });
      expect(outcome.status).toBe(error.getStatus());
      expectSafeErrorEnvelope(outcome);
      expect(outcome.body.message).toBe(error.message);
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Payments POST actions — input validation: the `:method` param, the reported payout
   * amount and its bounds, and the optional key and URL of a connection test, plus
   * legitimate inputs that must pass.
   */
  const methodFixtures: LayerFixture<string>[] = [
    { name: 'lower-case method', input: VALID_METHOD.toLowerCase(), expected: 'FAIL', message: 'Unknown payment method' },
    { name: 'unknown method', input: 'PAYPAL', expected: 'FAIL' },
    { name: 'method with surrounding spaces', input: ` ${VALID_METHOD} `, expected: 'FAIL' },
    { name: 'two methods', input: `${VALID_METHOD},${DonationPaymentMethod.CARD}`, expected: 'FAIL' },
    { name: 'enum index instead of a method', input: '0', expected: 'FAIL' },
  ];

  const confirmFixtures: LayerFixture[] = [
    { name: 'amount missing', input: {}, expected: 'FAIL', field: 'amount' },
    { name: 'amount zero', input: { amount: 0 }, expected: 'FAIL', field: 'amount' },
    { name: 'amount negative', input: { amount: -1 }, expected: 'FAIL', field: 'amount' },
    {
      name: 'amount over max',
      input: { amount: 1001 },
      expected: 'FAIL',
      field: 'amount',
      message: 'That is far more than CARES would ever send',
    },
    {
      name: 'amount with centavos',
      input: { amount: 1.5 },
      expected: 'FAIL',
      field: 'amount',
      message: 'Enter the amount in whole pesos',
    },
    { name: 'amount past the safe integer range', input: { amount: Number.MAX_SAFE_INTEGER + 1 }, expected: 'FAIL', field: 'amount' },
    { name: 'amount as a numeric string', input: { amount: '7' }, expected: 'FAIL', field: 'amount' },
    { name: 'amount empty string', input: { amount: '' }, expected: 'FAIL', field: 'amount' },
  ];

  const testFixtures: LayerFixture[] = [
    { name: 'secret_key under min', input: { secret_key: 'k'.repeat(SECRET_KEY_MIN - 1) }, expected: 'FAIL', field: 'secret_key' },
    { name: 'secret_key over max', input: { secret_key: 'k'.repeat(SECRET_KEY_MAX + 1) }, expected: 'FAIL', field: 'secret_key' },
    {
      name: 'secret_key under min once trimmed',
      input: { secret_key: `  ${'k'.repeat(SECRET_KEY_MIN - 1)}  ` },
      expected: 'FAIL',
      field: 'secret_key',
    },
    { name: 'secret_key empty', input: { secret_key: '' }, expected: 'FAIL', field: 'secret_key' },
    { name: 'secret_key whitespace-only', input: { secret_key: ' '.repeat(SECRET_KEY_MIN) }, expected: 'FAIL', field: 'secret_key' },
    { name: 'api_url over plain http', input: { api_url: 'http://api.xendit.co' }, expected: 'FAIL', field: 'api_url' },
    { name: 'api_url whitespace-only', input: { api_url: '   ' }, expected: 'FAIL', field: 'api_url' },
    { name: 'api_url without a scheme', input: { api_url: 'api.xendit.co' }, expected: 'FAIL', field: 'api_url' },
    { name: 'api_url scheme only', input: { api_url: 'https://' }, expected: 'FAIL', field: 'api_url' },
  ];

  describe('payments site · POST actions — input validation', () => {
    const ctx = usePaymentsApp();

    describe.each(METHOD_ENDPOINTS)('$title', (endpoint) => {
      describe('method', () => describeMethodTable(ctx, endpoint, methodFixtures));
    });

    describe(CONFIRM_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, CONFIRM_ENDPOINT, confirmFixtures));
    });

    describe(TEST_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, TEST_ENDPOINT, testFixtures));
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Payments POST actions — normalisation: the service receives the validated method, the
   * caller from the token and the trimmed key; the two actions without a body ignore one;
   * and the response schema keeps what must not reach the portal off the wire.
   */
  describe('payments site · POST actions — normalisation', () => {
    const ctx = usePaymentsApp();

    describe.each([VERIFY_ENDPOINT, PROOF_ENDPOINT])('$title', (endpoint) => {

      asCase('invalid', 'Client sends body fields the endpoint does not accept').it('ignores a body it does not read', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: { method: 'CARD', sub: 'someone-else' } });
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledWith(VALID_METHOD, CALLER);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Payments POST actions — security: hostile strings in the `:method` enum, the reported
   * amount and the gateway URL (all must FAIL), per-class payloads in the secret key, type
   * confusion, mass assignment, prototype pollution and malformed JSON.
   */
  const methodFixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `method ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'method ← enum value with SQL tail', input: `${VALID_METHOD}' OR '1'='1`, expected: 'FAIL' },
    { name: 'method ← enum value with stacked query', input: `${VALID_METHOD}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  const confirmFixtures: LayerFixture[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `amount ← ${p.category}: ${p.label}`,
      input: { amount: p.value },
      expected: 'FAIL',
      field: 'amount',
    })),
    // A number is what this field wants, so that payload is not type confusion here.
    ...OPERATOR_INJECTION_PAYLOADS.filter((p) => typeof p.value !== 'number').map((p): LayerFixture => ({
      name: `amount ← ${p.category}: ${p.label}`,
      input: { amount: p.value },
      expected: 'FAIL',
      field: 'amount',
    })),
    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_CONFIRM, ...extra },
      expected: 'FAIL',
    })),
    // The method comes from the path and the proof state from the server's own record.
    { name: 'mass assignment: method', input: { ...VALID_CONFIRM, method: 'CARD' }, expected: 'FAIL' },
    { name: 'mass assignment: account_proof', input: { ...VALID_CONFIRM, account_proof: 'VERIFIED' }, expected: 'FAIL' },
    { name: 'mass assignment: account_proof_attempts', input: { ...VALID_CONFIRM, account_proof_attempts: 0 }, expected: 'FAIL' },
  ];

  /** Padded past the minimum, so a payload is judged on its content and not on its length. */
  const asSecretKey = (value: unknown) => `${'k'.repeat(SECRET_KEY_MIN)}${value as string}`;

  const testFixtures: LayerFixture[] = [
    // The field trims, so it is treated as sanitised, and a key is one line: unlike a
    // reply's body, line breaks are not an exception.
    ...CONTROL_CHAR_PAYLOADS.map((p): LayerFixture => ({
      name: `secret_key ← ${p.category}: ${p.label}`,
      input: { secret_key: asSecretKey(p.value) },
      expected: 'FAIL',
      field: 'secret_key',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `secret_key ← ${p.category}: ${p.label}`,
      input: { secret_key: p.value },
      expected: 'FAIL',
      field: 'secret_key',
    })),
    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `api_url ← ${p.category}: ${p.label}`,
      input: { api_url: p.value },
      expected: 'FAIL',
      field: 'api_url',
    })),
    // The server sends the key being tried to this address.
    ...SSRF_URL_PAYLOADS.map((p): LayerFixture => ({
      name: `api_url ← ${p.category}: ${p.label}`,
      input: { api_url: p.value },
      expected: 'FAIL',
      field: 'api_url',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `api_url ← ${p.category}: ${p.label}`,
      input: { api_url: p.value },
      expected: 'FAIL',
      field: 'api_url',
    })),
    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_TEST, ...extra },
      expected: 'FAIL',
    })),
    // A connection test must not be able to change what the settings save holds.
    { name: 'mass assignment: mode', input: { ...VALID_TEST, mode: 'LIVE' }, expected: 'FAIL' },
    { name: 'mass assignment: enabled', input: { ...VALID_TEST, enabled: true }, expected: 'FAIL' },
    { name: 'mass assignment: webhook_token', input: { ...VALID_TEST, webhook_token: 'token-value' }, expected: 'FAIL' },
  ];

  describe('payments site · POST actions — security', () => {
    const ctx = usePaymentsApp();

    describe.each(METHOD_ENDPOINTS)('$title', (endpoint) => {
      describe('method', () => describeMethodTable(ctx, endpoint, methodFixtures));
    });

    describe(CONFIRM_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, CONFIRM_ENDPOINT, confirmFixtures));
    });

    describe(TEST_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, TEST_ENDPOINT, testFixtures));

      asCase('invalid', 'Staff enters a gateway key that is rejected').it('does not echo a rejected key back', async () => {
        const secret_key = 'xnd_rejected_key';
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: TEST_ENDPOINT.path(), body: { secret_key } });
        expectValidationEnvelope(outcome);
        expect(JSON.stringify(outcome.body)).not.toContain(secret_key);
      });
    });

    describe.each(BODY_ENDPOINTS)('$title', (endpoint) => {
      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(endpoint.schema, { ...endpoint.validBody, role_type: 'ADMIN' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: endpoint.path(),
          rawBody: withPollution(endpoint.validBody, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), rawBody: '{"amount":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      });
    });

    // The key must not be able to leave for an address the request chose, so this runs
    // the real service: the validators cannot tell a proxy from an attacker's host.
    describe('testConnection (real service)', () => {
      const SAVED = { secretKey: 'saved-secret-key', apiUrl: 'https://saved-host.example' };
      const REQUEST_URL = 'https://request-host.example';

      const testConnection = async (body: { secret_key?: string; api_url?: string }) => {
        const xendit = autoMock<any>({ getCashBalance: jest.fn().mockResolvedValue({}) });
        const service = new PaymentsSiteService(
          autoMock<any>({ findSettings: jest.fn().mockResolvedValue(null) }),
          autoMock<any>({ getConfig: jest.fn().mockResolvedValue({ credentials: SAVED, sandbox: false }) }),
          autoMock<any>(),
          autoMock<any>(),
          xendit,
          autoMock<any>(),
        );
        await service.testConnection(body, CALLER as never);
        return xendit.getCashBalance;
      };

      asCase('invalid', 'Attacker names another URL when testing the saved gateway key').it('sends the saved key to the saved host, whatever URL the request names', async () => {
        expect(await testConnection({ api_url: REQUEST_URL })).toHaveBeenCalledWith(SAVED);
      });
    });

    // PUT is outside this suite, but it shares these field rules: a saved URL is where
    // every later gateway call sends the key.
    describe('UpdatePaymentSettingsSchema (shared field rules)', () => {
      const VALID_UPDATE = { mode: 'TEST', enabled: false, methods: [] };
      const parse = (extra: object) => UpdatePaymentSettingsSchema.safeParseAsync({ ...VALID_UPDATE, ...extra });

      asCase('invalid', 'Attacker sets the gateway URL to an internal or non-https address (SSRF)', 'Request rejected with "Validation failed" on api_url (400)').it.each(SSRF_URL_PAYLOADS)('FAIL · api_url ← $label', async (p) => {
        expect((await parse({ api_url: p.value })).success).toBe(false);
      });

      asCase('invalid', 'Attacker hides control characters in the gateway secrets', 'Request rejected with "Validation failed" (400)').it.each(CONTROL_CHAR_PAYLOADS)('FAIL · secrets ← $label', async (p) => {
        expect((await parse({ secret_key: asSecretKey(p.value) })).success).toBe(false);
        expect((await parse({ webhook_token: asSecretKey(p.value) })).success).toBe(false);
      });
    });
  });
}
