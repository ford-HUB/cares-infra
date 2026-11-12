import { asCase } from '../../../../config/test-case';
import { DonationPaymentMethod } from '../../../../../src/infastructures/prisma/common/client';
import { SECRET_KEY_MAX, SECRET_KEY_MIN, UpdatePaymentSettingsSchema } from '../../../../../src/modules/payments/validators/payments-site-validator';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  CONFIRM_ENDPOINT,
  ENDPOINTS,
  METHOD_ENDPOINTS,
  SETTINGS_RESPONSE,
  TEST_ENDPOINT,
  VALID_CONFIRM,
  VALID_METHOD,
  VALID_TEST,
  describeBodyTable,
  describeMethodTable,
  usePaymentsApp,
  CALLER,
  PROOF_ENDPOINT,
  VERIFY_ENDPOINT,
  BODY_ENDPOINTS,
} from '../payments-site-support';
import { PaymentsSiteService } from '../../../../../src/modules/payments/services/payments-site-service';
import {
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Payments Module · Payment Gateway Settings — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Payments POST actions — input validation: the `:method` param, the reported payout
   * amount and its bounds, and the optional key and URL of a connection test, plus
   * legitimate inputs that must pass.
   */
  const methodFixtures: LayerFixture<string>[] = [
    ...Object.values(DonationPaymentMethod).map((method): LayerFixture<string> => ({
      name: `method ${method}`,
      input: method,
      expected: 'PASS',
    })),
  ];

  const confirmFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_CONFIRM, expected: 'PASS' },
    { name: 'amount at min', input: { amount: 1 }, expected: 'PASS' },
    { name: 'amount at max', input: { amount: 1000 }, expected: 'PASS' },
  ];

  const testFixtures: LayerFixture[] = [
    { name: 'empty body uses the saved key', input: {}, expected: 'PASS' },
    { name: 'every field', input: VALID_TEST, expected: 'PASS' },
    { name: 'key only', input: { secret_key: VALID_TEST.secret_key }, expected: 'PASS' },
    { name: 'url only', input: { api_url: VALID_TEST.api_url }, expected: 'PASS' },
    { name: 'secret_key at min length', input: { secret_key: 'k'.repeat(SECRET_KEY_MIN) }, expected: 'PASS' },
    { name: 'secret_key at max length', input: { secret_key: 'k'.repeat(SECRET_KEY_MAX) }, expected: 'PASS' },
    { name: 'secret_key at min once trimmed', input: { secret_key: `  ${'k'.repeat(SECRET_KEY_MIN)}  ` }, expected: 'PASS' },
    { name: 'api_url empty falls back to the saved one', input: { api_url: '' }, expected: 'PASS' },
    { name: 'api_url with a path', input: { api_url: 'https://api.xendit.co/v2/' }, expected: 'PASS' },
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

    asCase('valid', 'Staff submits a valid request').it.each(ENDPOINTS)('answers 200 in the success envelope · $title', async (endpoint) => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(),
        body: endpoint.validBody,
      });
      expect(outcome.status).toBe(200);
      expect(outcome.body).toEqual({ ok: true, message: endpoint.message, data: SETTINGS_RESPONSE });
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
      asCase('valid', 'Staff submits a valid request').it('passes the method and the caller to the service', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path() });
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledTimes(1);
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledWith(VALID_METHOD, CALLER);
      });
    });

    describe(CONFIRM_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the method, the amount alone and the caller to the service', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: CONFIRM_ENDPOINT.path(), body: VALID_CONFIRM });
        expect(ctx.service.confirmAccountProof).toHaveBeenCalledTimes(1);
        expect(ctx.service.confirmAccountProof).toHaveBeenCalledWith(VALID_METHOD, VALID_CONFIRM.amount, CALLER);
      });
    });

    describe(TEST_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the trimmed key and the caller to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: TEST_ENDPOINT.path(),
          body: { ...VALID_TEST, secret_key: `  ${VALID_TEST.secret_key}\n` },
        });
        expect(ctx.service.testConnection).toHaveBeenCalledTimes(1);
        expect(ctx.service.testConnection).toHaveBeenCalledWith(VALID_TEST, CALLER);
      });

      asCase('valid', 'Staff leaves the optional fields out').it('leaves omitted fields unset, so the service falls back to the saved ones', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: TEST_ENDPOINT.path(), body: {} });
        expect(ctx.service.testConnection).toHaveBeenCalledWith({}, CALLER);
      });

      asCase('valid', 'Staff tests the gateway connection').it('carries the gateway verdict back on a 200', async () => {
        const verification_error = 'The payment gateway could not be reached';
        ctx.service.testConnection.mockResolvedValueOnce({ ...SETTINGS_RESPONSE, verification_error } as never);
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: TEST_ENDPOINT.path(), body: VALID_TEST });
        expect(outcome.status).toBe(200);
        expect(outcome.body.data.verification_error).toBe(verification_error);
      });
    });

    asCase('valid', 'Staff verifies, proves or tests a payment method', 'Stored secrets and the payout amount stay out of the response (each endpoint)').it.each([VERIFY_ENDPOINT, PROOF_ENDPOINT, CONFIRM_ENDPOINT, TEST_ENDPOINT])(
      'keeps stored secrets and the payout amount out of the response · $title',
      async (endpoint) => {
        ctx.service[endpoint.handler].mockResolvedValueOnce({
          ...SETTINGS_RESPONSE,
          secret_key: VALID_TEST.secret_key,
          secret_key_cipher: 'stored-key-cipher',
          webhook_token_cipher: 'stored-token-cipher',
          methods: [{ ...SETTINGS_RESPONSE.methods[0], account_proof_amount: 7 }],
        } as never);

        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.validBody });

        expect(outcome.status).toBe(200);
        expect(outcome.body.data).toEqual(SETTINGS_RESPONSE);
      },
    );
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /** Padded past the minimum, so a payload is judged on its content and not on its length. */
  const asSecretKey = (value: unknown) => `${'k'.repeat(SECRET_KEY_MIN)}${value as string}`;

  const testFixtures: LayerFixture[] = [
    // Credential text, like a password: it is base64-encoded into a header and never
    // reaches SQL or a page, so punctuation is no reason to refuse it.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `secret_key ← ${p.category}: ${p.label}`,
        input: { secret_key: asSecretKey(p.value) },
        expected: 'PASS',
      }),
    ),
  ];

  describe('payments site · POST actions — security', () => {
    const ctx = usePaymentsApp();

    describe.each(METHOD_ENDPOINTS)('$title', (endpoint) => {
    });

    describe(TEST_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, TEST_ENDPOINT, testFixtures));
    });

    describe.each(BODY_ENDPOINTS)('$title', (endpoint) => {
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

      asCase('valid', 'Staff tests a new key against a new gateway URL').it('sends a key from the request to the URL from the request', async () => {
        const secret_key = VALID_TEST.secret_key;
        expect(await testConnection({ secret_key, api_url: REQUEST_URL })).toHaveBeenCalledWith({
          secretKey: secret_key,
          apiUrl: REQUEST_URL,
        });
      });

      asCase('valid', 'Staff tests a new key without naming a URL').it('sends a key from the request to the saved host when no URL is named', async () => {
        const secret_key = VALID_TEST.secret_key;
        expect(await testConnection({ secret_key })).toHaveBeenCalledWith({ secretKey: secret_key, apiUrl: SAVED.apiUrl });
      });
    });

    // PUT is outside this suite, but it shares these field rules: a saved URL is where
    // every later gateway call sends the key.
    describe('UpdatePaymentSettingsSchema (shared field rules)', () => {
      const VALID_UPDATE = { mode: 'TEST', enabled: false, methods: [] };
      const parse = (extra: object) => UpdatePaymentSettingsSchema.safeParseAsync({ ...VALID_UPDATE, ...extra });

      asCase('valid', 'Staff sets an https gateway URL, or clears it').it('PASS · still takes an https URL, and "" or null to clear', async () => {
        expect((await parse({ api_url: VALID_TEST.api_url })).data?.api_url).toBe(VALID_TEST.api_url);
        expect((await parse({ api_url: '' })).data?.api_url).toBeNull();
        expect((await parse({ api_url: null })).data?.api_url).toBeNull();
      });

      asCase('valid', 'Staff clears a secret with null, or leaves it out to keep it').it('PASS · still clears a secret with null and keeps it when omitted', async () => {
        const cleared = await parse({ secret_key: null, webhook_token: null });
        expect(cleared.data).toMatchObject({ secret_key: null, webhook_token: null });
        expect((await parse({})).data).not.toHaveProperty('secret_key');
      });
    });
  });
}
