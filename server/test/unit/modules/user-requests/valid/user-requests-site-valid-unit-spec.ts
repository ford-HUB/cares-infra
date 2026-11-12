import { asCase } from '../../../../config/test-case';
import { REJECTION_REASON_MAX_LENGTH } from '../../../../../src/modules/user-requests/validators/user-requests-site-validator';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  ENDPOINTS,
  REJECT_ENDPOINT,
  REQUEST_RESPONSE,
  VALID_REJECT,
  VALID_REQUEST_ID,
  describeRejectBodyTable,
  describeRequestIdTable,
  useUserRequestsApp,
  BODYLESS_ENDPOINTS,
  CALLER,
} from '../user-requests-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Users Module · User Request Decision — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * User requests POST actions — input validation: the request id path param, and the
   * reject reason's required, empty and length rules plus legitimate inputs that must pass.
   */
  const requestIdFixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_REQUEST_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_REQUEST_ID.toUpperCase(), expected: 'PASS' },
  ];

  const rejectFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_REJECT, expected: 'PASS' },
    { name: 'reason at min length', input: { reason: 'a' }, expected: 'PASS' },
    { name: 'reason at max length', input: { reason: 'a'.repeat(REJECTION_REASON_MAX_LENGTH) }, expected: 'PASS' },
    { name: 'reason at max once trimmed', input: { reason: `   ${'a'.repeat(REJECTION_REASON_MAX_LENGTH)}   ` }, expected: 'PASS' },
    { name: 'reason with line breaks', input: { reason: 'Line one\nLine two\n\nLine four' }, expected: 'PASS' },
    { name: 'reason with a tab', input: { reason: 'ID:\tnot readable' }, expected: 'PASS' },
    { name: 'reason with accents and emoji', input: { reason: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  describe('user requests site · POST actions — input validation', () => {
    const ctx = useUserRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describe('id', () => describeRequestIdTable(ctx, endpoint, requestIdFixtures));
    });

    describe(REJECT_ENDPOINT.title, () => {
      describe('body', () => describeRejectBodyTable(ctx, rejectFixtures));
    });

    asCase('valid', 'Staff submits a valid request').it.each(ENDPOINTS)('wraps the updated request in the success envelope · $title', async (endpoint) => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(),
        body: endpoint.validBody,
      });
      expect(outcome.status).toBe(201);
      expect(outcome.body).toEqual({ ok: true, message: endpoint.message, data: REQUEST_RESPONSE });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * User requests POST actions — normalisation: the service receives the validated id,
   * the caller from the token and the trimmed reason; the actions without a body ignore
   * one; and the response schema keeps stored file locations off the wire.
   */
  describe('user requests site · POST actions — normalisation', () => {
    const ctx = useUserRequestsApp();

    describe.each(BODYLESS_ENDPOINTS)('$title', (endpoint) => {
      asCase('valid', 'Staff submits a valid request').it('passes the id and the caller to the service', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path() });
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledTimes(1);
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledWith(VALID_REQUEST_ID, CALLER.sub);
      });
    });

    describe(REJECT_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the id, the caller and the trimmed reason to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: REJECT_ENDPOINT.path(),
          body: { reason: `  ${VALID_REJECT.reason}\n  ` },
        });
        expect(ctx.service.reject).toHaveBeenCalledTimes(1);
        expect(ctx.service.reject).toHaveBeenCalledWith(VALID_REQUEST_ID, CALLER.sub, VALID_REJECT);
      });

      asCase('valid', 'Staff enters a reason spanning several lines').it('keeps line breaks inside the reason', async () => {
        const reason = 'Line one\n\nLine three';
        await runApiLayer(ctx.app, { method: 'post', path: REJECT_ENDPOINT.path(), body: { reason } });
        expect(ctx.service.reject.mock.calls[0][2]).toEqual({ reason });
      });
    });

    asCase('valid', 'The service returns internal fields along with the result').it.each(ENDPOINTS)('keeps stored file locations out of the response · $title', async (endpoint) => {
      ctx.service[endpoint.handler].mockResolvedValueOnce({
        ...REQUEST_RESPONSE,
        id_front_url: 'private/id-front.jpg',
        selfie_url: 'private/selfie.jpg',
        attachments: [{ ...REQUEST_RESPONSE.attachments[0], url: 'private/id-front.jpg' }],
      } as never);

      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.validBody });

      expect(outcome.status).toBe(201);
      expect(outcome.body.data).toEqual(REQUEST_RESPONSE);
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  const rejectFixtures: LayerFixture[] = [
    // Free text: stored as data through Prisma and escaped by the portal and app when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `reason ← ${p.category}: ${p.label}`,
        input: { reason: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { reason: p.value },
      expected: 'PASS',
      field: 'reason',
    })),
  ];

  describe('user requests site · POST actions — security', () => {
    const ctx = useUserRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
    });

    describe(REJECT_ENDPOINT.title, () => {
      describe('body', () => describeRejectBodyTable(ctx, rejectFixtures));
    });

    describe.each(BODYLESS_ENDPOINTS)('$title', (endpoint) => {
    });
  });
}
