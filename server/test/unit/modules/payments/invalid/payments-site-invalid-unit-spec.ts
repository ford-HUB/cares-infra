import { DonationPaymentMethod } from '../../../../../src/infastructures/prisma/common/client';
import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_NUMBER_MAX,
  DISPLAY_NAME_MAX,
  INSTRUCTIONS_MAX,
  SECRET_KEY_MAX,
  SECRET_KEY_MIN,
  STATEMENT_NAME_MAX,
  UpdatePaymentSettingsSchema,
} from '../../../../../src/modules/payments/validators/payments-site-validator';
import { PAYMENT_CHANNEL_CODES } from '../../../../../src/shared/constants/payment-methods';
import { DONATION_MAX_AMOUNT } from '../../../../../src/modules/donations/validators/donations-mobile-validator';
import {
  LayerFixture,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../../config/layer-harness';
import { fixtureCases } from '../../../../config/test-case';
import {
  CONFIRM_ENDPOINT,
  METHOD_ENDPOINTS,
  SETTINGS_RESPONSE,
  TEST_ENDPOINT,
  VALID_CONFIRM,
  VALID_METHOD,
  VALID_TEST,
  describeBodyTable,
  describeMethodTable,
  usePaymentsApp,
} from '../payments-site-support';

/**
 * Payments Module · Payment Gateway Settings — invalid inputs (field validation).
 *
 * Every case here is an intentionally wrong value for one field of the portal's
 * Payments screen. A case Passes when the request is refused with "Validation failed"
 * (400) on that field — and, where the schema defines one, the exact message — without
 * reaching the service. Each fixture keeps every other field valid, so the named field
 * is the only reason it can fail.
 *
 *   :method  POST …/methods/:method/verify · /account-proof · /account-proof/confirm
 *   amount   POST …/methods/:method/account-proof/confirm   (ConfirmAccountProofSchema)
 *   key, url POST …/settings/test                           (TestPaymentGatewaySchema)
 *   the form PUT  …/settings                                (UpdatePaymentSettingsSchema)
 *
 * The valid cases for this unit live in ../valid/.
 */

const UNKNOWN_METHOD = 'Unknown payment method';
const NOT_A_KEY = 'That does not look like a Xendit secret key';
const ONE_LINE = 'Cannot contain control characters';
const WHOLE_PESOS = 'Enter the amount in whole pesos';
const TOO_MUCH = 'That is far more than CARES would ever send';
const UNKNOWN_CHANNEL = 'Unknown payment channel';
const MAX_BELOW_MIN = 'The maximum must not be below the minimum';
const METHOD_ONCE = 'Each payment method may appear only once';

/* ── :method ─────────────────────────────────────────────────────────────── */
const methodFixtures: LayerFixture<string>[] = [
  { name: 'Director picks a payment method in lower case (gcash)', input: VALID_METHOD.toLowerCase(), expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
  { name: 'Director picks a payment method by its label (GCash)', input: 'GCash', expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
  { name: 'Director picks a payment method that does not exist (PAYPAL)', input: 'PAYPAL', expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
  { name: 'Director picks a bank channel code instead of a method (BPI)', input: 'BPI', expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
  { name: 'Director picks a payment method with surrounding spaces', input: ` ${VALID_METHOD} `, expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
  { name: 'Director sends two payment methods at once', input: `${VALID_METHOD},${DonationPaymentMethod.CARD}`, expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
  { name: 'Director sends a method number instead of its name (0)', input: '0', expected: 'FAIL', field: '', message: UNKNOWN_METHOD },
];

/* ── confirm: amount ─────────────────────────────────────────────────────── */
const confirmFixtures: LayerFixture[] = [
  { name: 'Director confirms without entering the amount', input: {}, expected: 'FAIL', field: 'amount' },
  { name: 'Director reports an amount of 0', input: { amount: 0 }, expected: 'FAIL', field: 'amount' },
  { name: 'Director reports a negative amount', input: { amount: -1 }, expected: 'FAIL', field: 'amount' },
  { name: 'Director reports 1001 pesos, one over the limit', input: { amount: 1001 }, expected: 'FAIL', field: 'amount', message: TOO_MUCH },
  { name: 'Director reports an amount with centavos (1.50)', input: { amount: 1.5 }, expected: 'FAIL', field: 'amount', message: WHOLE_PESOS },
  { name: 'Director reports the amount as text ("7")', input: { amount: '7' }, expected: 'FAIL', field: 'amount' },
  { name: 'Director reports the amount with a peso sign ("₱7")', input: { amount: '₱7' }, expected: 'FAIL', field: 'amount' },
  { name: 'Director sends an empty amount', input: { amount: '' }, expected: 'FAIL', field: 'amount' },
  { name: 'Director sends the amount as null', input: { amount: null }, expected: 'FAIL', field: 'amount' },
  { name: 'Client sends the amount as "amount_php" instead of "amount"', input: { amount_php: VALID_CONFIRM.amount }, expected: 'FAIL', field: 'amount' },
];

/* ── test connection: secret_key, api_url ────────────────────────────────── */
const testFixtures: LayerFixture[] = [
  { name: 'Director tests an empty key', input: { secret_key: '' }, expected: 'FAIL', field: 'secret_key' },
  { name: 'Director tests a key of only spaces', input: { secret_key: ' '.repeat(SECRET_KEY_MIN) }, expected: 'FAIL', field: 'secret_key' },
  {
    name: `Director tests a key of ${SECRET_KEY_MIN - 1} characters, one under the minimum`,
    input: { secret_key: 'k'.repeat(SECRET_KEY_MIN - 1) },
    expected: 'FAIL',
    field: 'secret_key',
  },
  {
    name: `Director tests a key of ${SECRET_KEY_MAX + 1} characters, one over the maximum`,
    input: { secret_key: 'k'.repeat(SECRET_KEY_MAX + 1) },
    expected: 'FAIL',
    field: 'secret_key',
  },
  {
    name: 'Director pastes a key that wraps onto two lines',
    input: { secret_key: `${VALID_TEST.secret_key.slice(0, 22)}\n${VALID_TEST.secret_key.slice(22)}` },
    expected: 'FAIL',
    field: 'secret_key',
    message: ONE_LINE,
  },
  { name: 'Director sends the key as null', input: { secret_key: null }, expected: 'FAIL', field: 'secret_key' },
  { name: 'Director tests a gateway URL over plain http', input: { api_url: 'http://api.xendit.co' }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director tests a gateway URL without a scheme', input: { api_url: 'api.xendit.co' }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director tests a gateway URL that is only a scheme', input: { api_url: 'https://' }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director tests a gateway URL of only spaces', input: { api_url: '   ' }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director sends the gateway URL as null', input: { api_url: null }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director tries to switch the gateway to LIVE while testing', input: { ...VALID_TEST, mode: 'LIVE' }, expected: 'FAIL' },
];

/* ── save settings (PUT) ─────────────────────────────────────────────────── */
const SETTINGS_PATH = '/api/v1/payments/settings';
const VALID_SETTINGS = { mode: 'TEST', enabled: true, methods: [] as unknown[] };
const VALID_ENTRY = { method: DonationPaymentMethod.GCASH, enabled: true };
const CHANNEL = PAYMENT_CHANNEL_CODES[0];

/** The valid form with `field` removed. */
const settingsWithout = (field: keyof typeof VALID_SETTINGS) => {
  const { [field]: _omitted, ...rest } = VALID_SETTINGS;
  return rest;
};
/** The valid form with one method entry, `patch` applied to it. */
const withEntry = (patch: Record<string, unknown>) => ({ ...VALID_SETTINGS, methods: [{ ...VALID_ENTRY, ...patch }] });
/** The valid form with one method entry missing `field`. */
const entryWithout = (field: keyof typeof VALID_ENTRY) => {
  const { [field]: _omitted, ...rest } = VALID_ENTRY;
  return { ...VALID_SETTINGS, methods: [rest] };
};

const settingsFixtures: LayerFixture[] = [
  // mode / enabled
  { name: 'Director saves without a gateway mode', input: settingsWithout('mode'), expected: 'FAIL', field: 'mode' },
  { name: 'Director saves the gateway mode in lower case (test)', input: { ...VALID_SETTINGS, mode: 'test' }, expected: 'FAIL', field: 'mode' },
  { name: 'Director saves a gateway mode that does not exist (SANDBOX)', input: { ...VALID_SETTINGS, mode: 'SANDBOX' }, expected: 'FAIL', field: 'mode' },
  { name: 'Director saves without the on/off switch', input: settingsWithout('enabled'), expected: 'FAIL', field: 'enabled' },
  { name: 'Director sends the on/off switch as the text "true"', input: { ...VALID_SETTINGS, enabled: 'true' }, expected: 'FAIL', field: 'enabled' },

  // secret_key / webhook_token
  { name: 'Director saves an empty secret key', input: { ...VALID_SETTINGS, secret_key: '' }, expected: 'FAIL', field: 'secret_key', message: NOT_A_KEY },
  {
    name: `Director saves a secret key of ${SECRET_KEY_MIN - 1} characters`,
    input: { ...VALID_SETTINGS, secret_key: 'k'.repeat(SECRET_KEY_MIN - 1) },
    expected: 'FAIL',
    field: 'secret_key',
    message: NOT_A_KEY,
  },
  {
    name: `Director saves a secret key of ${SECRET_KEY_MAX + 1} characters`,
    input: { ...VALID_SETTINGS, secret_key: 'k'.repeat(SECRET_KEY_MAX + 1) },
    expected: 'FAIL',
    field: 'secret_key',
  },
  {
    name: 'Director saves a secret key that wraps onto two lines',
    input: { ...VALID_SETTINGS, secret_key: `${VALID_TEST.secret_key.slice(0, 22)}\r\n${VALID_TEST.secret_key.slice(22)}` },
    expected: 'FAIL',
    field: 'secret_key',
    message: ONE_LINE,
  },
  { name: 'Director saves a webhook token of 7 characters', input: { ...VALID_SETTINGS, webhook_token: 'tok-123' }, expected: 'FAIL', field: 'webhook_token' },
  {
    name: `Director saves a webhook token of ${SECRET_KEY_MAX + 1} characters`,
    input: { ...VALID_SETTINGS, webhook_token: 't'.repeat(SECRET_KEY_MAX + 1) },
    expected: 'FAIL',
    field: 'webhook_token',
  },
  {
    name: 'Director saves a webhook token that wraps onto two lines',
    input: { ...VALID_SETTINGS, webhook_token: 'webhook-token\nvalue' },
    expected: 'FAIL',
    field: 'webhook_token',
    message: ONE_LINE,
  },

  // api_url
  { name: 'Director saves a gateway URL over plain http', input: { ...VALID_SETTINGS, api_url: 'http://api.xendit.co' }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director saves a gateway URL without a scheme', input: { ...VALID_SETTINGS, api_url: 'api.xendit.co' }, expected: 'FAIL', field: 'api_url' },
  { name: 'Director saves a gateway URL of only spaces', input: { ...VALID_SETTINGS, api_url: '   ' }, expected: 'FAIL', field: 'api_url' },

  // statement_name / support_email / support_contact
  {
    name: `Director saves a statement name of ${STATEMENT_NAME_MAX + 1} characters`,
    input: { ...VALID_SETTINGS, statement_name: 'a'.repeat(STATEMENT_NAME_MAX + 1) },
    expected: 'FAIL',
    field: 'statement_name',
  },
  { name: 'Director saves a support email with no domain (support@)', input: { ...VALID_SETTINGS, support_email: 'support@' }, expected: 'FAIL', field: 'support_email' },
  { name: 'Director saves a support email with no @ (support.cares.ph)', input: { ...VALID_SETTINGS, support_email: 'support.cares.ph' }, expected: 'FAIL', field: 'support_email' },
  { name: 'Director saves a support email with a space in it', input: { ...VALID_SETTINGS, support_email: 'support @cares.ph' }, expected: 'FAIL', field: 'support_email' },
  {
    name: `Director saves a support contact of ${ACCOUNT_NUMBER_MAX + 1} characters`,
    input: { ...VALID_SETTINGS, support_contact: '0'.repeat(ACCOUNT_NUMBER_MAX + 1) },
    expected: 'FAIL',
    field: 'support_contact',
  },

  // methods (the list)
  { name: 'Director saves without the list of payment methods', input: settingsWithout('methods'), expected: 'FAIL', field: 'methods' },
  { name: 'Director sends one payment method instead of a list', input: { ...VALID_SETTINGS, methods: VALID_ENTRY }, expected: 'FAIL', field: 'methods' },
  {
    name: 'Director lists the same payment method twice',
    input: { ...VALID_SETTINGS, methods: [VALID_ENTRY, VALID_ENTRY] },
    expected: 'FAIL',
    field: 'methods',
    message: METHOD_ONCE,
  },
  { name: 'Director sends 21 payment method entries, one over the maximum', input: { ...VALID_SETTINGS, methods: Array(21).fill(VALID_ENTRY) }, expected: 'FAIL', field: 'methods' },

  // methods[] entry
  { name: 'Director saves a payment method entry without its method', input: entryWithout('method'), expected: 'FAIL', field: 'methods.0.method' },
  { name: 'Director saves a payment method that does not exist (PAYPAL)', input: withEntry({ method: 'PAYPAL' }), expected: 'FAIL', field: 'methods.0.method' },
  { name: 'Director saves a payment method in lower case (gcash)', input: withEntry({ method: 'gcash' }), expected: 'FAIL', field: 'methods.0.method' },
  { name: 'Director saves a payment method entry without its on/off switch', input: entryWithout('enabled'), expected: 'FAIL', field: 'methods.0.enabled' },
  { name: 'Director sends a method on/off switch as the text "yes"', input: withEntry({ enabled: 'yes' }), expected: 'FAIL', field: 'methods.0.enabled' },
  {
    name: `Director saves a display name of ${DISPLAY_NAME_MAX + 1} characters`,
    input: withEntry({ display_name: 'a'.repeat(DISPLAY_NAME_MAX + 1) }),
    expected: 'FAIL',
    field: 'methods.0.display_name',
  },
  {
    name: `Director saves payment instructions of ${INSTRUCTIONS_MAX + 1} characters`,
    input: withEntry({ instructions: 'a'.repeat(INSTRUCTIONS_MAX + 1) }),
    expected: 'FAIL',
    field: 'methods.0.instructions',
  },
  {
    name: `Director saves an account name of ${ACCOUNT_NAME_MAX + 1} characters`,
    input: withEntry({ account_name: 'a'.repeat(ACCOUNT_NAME_MAX + 1) }),
    expected: 'FAIL',
    field: 'methods.0.account_name',
  },
  {
    name: `Director saves an account number of ${ACCOUNT_NUMBER_MAX + 1} characters`,
    input: withEntry({ account_number: '0'.repeat(ACCOUNT_NUMBER_MAX + 1) }),
    expected: 'FAIL',
    field: 'methods.0.account_number',
  },
  { name: 'Director sends the account number as a number', input: withEntry({ account_number: 9171234567 }), expected: 'FAIL', field: 'methods.0.account_number' },
  {
    name: 'Director picks a channel code that does not exist (XYZ)',
    input: withEntry({ channel_codes: ['XYZ'] }),
    expected: 'FAIL',
    field: 'methods.0.channel_codes.0',
    message: UNKNOWN_CHANNEL,
  },
  {
    name: 'Director picks a channel code in lower case',
    input: withEntry({ channel_codes: [CHANNEL.toLowerCase()] }),
    expected: 'FAIL',
    field: 'methods.0.channel_codes.0',
    message: UNKNOWN_CHANNEL,
  },
  { name: 'Director sends one channel code instead of a list', input: withEntry({ channel_codes: CHANNEL }), expected: 'FAIL', field: 'methods.0.channel_codes' },
  { name: 'Director sends 21 channel codes, one over the maximum', input: withEntry({ channel_codes: Array(21).fill(CHANNEL) }), expected: 'FAIL', field: 'methods.0.channel_codes' },
  { name: 'Director sets a negative minimum amount', input: withEntry({ min_amount: -1 }), expected: 'FAIL', field: 'methods.0.min_amount' },
  { name: 'Director sets a minimum amount with centavos (10.50)', input: withEntry({ min_amount: 10.5 }), expected: 'FAIL', field: 'methods.0.min_amount' },
  {
    name: `Director sets a minimum amount over the donation ceiling (${DONATION_MAX_AMOUNT + 1})`,
    input: withEntry({ min_amount: DONATION_MAX_AMOUNT + 1 }),
    expected: 'FAIL',
    field: 'methods.0.min_amount',
  },
  { name: 'Director sends the minimum amount as text ("100")', input: withEntry({ min_amount: '100' }), expected: 'FAIL', field: 'methods.0.min_amount' },
  { name: 'Director sets a negative maximum amount', input: withEntry({ max_amount: -1 }), expected: 'FAIL', field: 'methods.0.max_amount' },
  {
    name: `Director sets a maximum amount over the donation ceiling (${DONATION_MAX_AMOUNT + 1})`,
    input: withEntry({ max_amount: DONATION_MAX_AMOUNT + 1 }),
    expected: 'FAIL',
    field: 'methods.0.max_amount',
  },
  {
    name: 'Director sets a maximum amount below the minimum (100 to 50)',
    input: withEntry({ min_amount: 100, max_amount: 50 }),
    expected: 'FAIL',
    field: 'methods.0.max_amount',
    message: MAX_BELOW_MIN,
  },
  { name: 'Client sends a read-only field in a method entry (default_label)', input: withEntry({ default_label: 'GCash' }), expected: 'FAIL' },

  // the form as a whole
  { name: 'Client sends a read-only field with the form (secret_key_last4)', input: { ...VALID_SETTINGS, secret_key_last4: 'wxyz' }, expected: 'FAIL' },
];

/**
 * PUT fixtures through both layers. The support's tables cover the POST actions only,
 * so the save gets its own here; a FAIL must come back in the validation envelope
 * without reaching the service.
 */
const describeSettingsTable = (ctx: ReturnType<typeof usePaymentsApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(UpdatePaymentSettingsSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'put', path: SETTINGS_PATH, body: fixture.input });
      expectLayer(outcome, fixture);
      expectValidationEnvelope(outcome);
      expect(ctx.service.updateSettings).not.toHaveBeenCalled();
    });
  });
};

describe('payments site — field validation', () => {
  const ctx = usePaymentsApp();

  beforeEach(() => {
    ctx.service.updateSettings.mockReset().mockResolvedValue(SETTINGS_RESPONSE as never);
  });

  describe.each(METHOD_ENDPOINTS)('$title', (endpoint) => {
    describe('method', () => describeMethodTable(ctx, endpoint, methodFixtures));
  });

  describe(CONFIRM_ENDPOINT.title, () => {
    describe('amount', () => describeBodyTable(ctx, CONFIRM_ENDPOINT, confirmFixtures));
  });

  describe(TEST_ENDPOINT.title, () => {
    describe('body', () => describeBodyTable(ctx, TEST_ENDPOINT, testFixtures));
  });

  describe(`PUT ${SETTINGS_PATH}`, () => {
    describe('form', () => describeSettingsTable(ctx, settingsFixtures));
  });
});
