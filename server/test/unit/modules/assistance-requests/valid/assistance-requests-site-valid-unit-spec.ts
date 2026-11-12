import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  APPROVE_ENDPOINT,
  DECLINE_ENDPOINT,
  ENDPOINTS,
  REQUEST_RESPONSE,
  VALID_APPROVE,
  VALID_DECLINE,
  VALID_REQUEST_ID,
  describeBodyTable,
  describeRequestIdTable,
  useAssistanceRequestsApp,
} from '../assistance-requests-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Users Module · Assistance Request Decision — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Assistance requests approve / decline — input validation: the request id path param,
   * the optional approval note, and the decline reason's required, empty and length rules,
   * plus legitimate inputs that must pass.
   */
  const requestIdFixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_REQUEST_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_REQUEST_ID.toUpperCase(), expected: 'PASS' },
  ];

  const approveFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_APPROVE, expected: 'PASS' },
    { name: 'note omitted', input: {}, expected: 'PASS' },
    { name: 'note null, as the portal sends a blank box', input: { note: null }, expected: 'PASS' },
    { name: 'note empty', input: { note: '' }, expected: 'PASS' },
    { name: 'note whitespace-only', input: { note: '   ' }, expected: 'PASS' },
    { name: 'note at max length', input: { note: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'note at max once trimmed', input: { note: `   ${'a'.repeat(500)}   ` }, expected: 'PASS' },
    { name: 'note with line breaks', input: { note: 'Line one\nLine two\n\nLine four' }, expected: 'PASS' },
    { name: 'note with a tab', input: { note: 'Claim:\tMonday' }, expected: 'PASS' },
    { name: 'note with accents and emoji', input: { note: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  const declineFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_DECLINE, expected: 'PASS' },
    { name: 'reason at min length', input: { reason: 'a' }, expected: 'PASS' },
    { name: 'reason at max length', input: { reason: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'reason at max once trimmed', input: { reason: `   ${'a'.repeat(500)}   ` }, expected: 'PASS' },
    { name: 'reason with line breaks', input: { reason: 'Line one\nLine two\n\nLine four' }, expected: 'PASS' },
    { name: 'reason with accents and emoji', input: { reason: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  describe('assistance requests site · approve and decline — input validation', () => {
    const ctx = useAssistanceRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describe('id', () => describeRequestIdTable(ctx, endpoint, requestIdFixtures));
    });

    describe(APPROVE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, APPROVE_ENDPOINT, approveFixtures));
    });

    describe(DECLINE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, DECLINE_ENDPOINT, declineFixtures));
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
   * Assistance requests approve / decline — normalisation: the service receives the
   * validated id and the trimmed text, and the response schema keeps stored file
   * locations off the wire.
   */
  describe('assistance requests site · approve and decline — normalisation', () => {
    const ctx = useAssistanceRequestsApp();

    describe(APPROVE_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the id and the trimmed note to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: APPROVE_ENDPOINT.path(),
          body: { note: `  ${VALID_APPROVE.note}\n  ` },
        });
        expect(ctx.service.approve).toHaveBeenCalledTimes(1);
        expect(ctx.service.approve).toHaveBeenCalledWith(VALID_REQUEST_ID, VALID_APPROVE);
      });

      asCase('valid', 'Staff leaves the note empty or out').it('keeps a null note null and an omitted note unset', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: APPROVE_ENDPOINT.path(), body: { note: null } });
        expect(ctx.service.approve).toHaveBeenLastCalledWith(VALID_REQUEST_ID, { note: null });

        await runApiLayer(ctx.app, { method: 'post', path: APPROVE_ENDPOINT.path(), body: {} });
        expect(ctx.service.approve).toHaveBeenLastCalledWith(VALID_REQUEST_ID, {});
      });
    });

    describe(DECLINE_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the id and the trimmed reason to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: DECLINE_ENDPOINT.path(),
          body: { reason: `  ${VALID_DECLINE.reason}\n  ` },
        });
        expect(ctx.service.decline).toHaveBeenCalledTimes(1);
        expect(ctx.service.decline).toHaveBeenCalledWith(VALID_REQUEST_ID, VALID_DECLINE);
      });

      asCase('valid', 'Staff enters a reason spanning several lines').it('keeps line breaks inside the reason', async () => {
        const reason = 'Line one\n\nLine three';
        await runApiLayer(ctx.app, { method: 'post', path: DECLINE_ENDPOINT.path(), body: { reason } });
        expect(ctx.service.decline.mock.calls[0][1]).toEqual({ reason });
      });
    });

    asCase('valid', 'The service returns internal fields along with the result').it.each(ENDPOINTS)('keeps stored file locations out of the response · $title', async (endpoint) => {
      ctx.service[endpoint.handler].mockResolvedValueOnce({
        ...REQUEST_RESPONSE,
        attachments: [{ ...REQUEST_RESPONSE.attachments[0], url: 'private/prescription.pdf' }],
      } as never);

      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.validBody });

      expect(outcome.status).toBe(201);
      expect(outcome.body.data).toEqual(REQUEST_RESPONSE);
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /** The two free-text fields hold to one rule; only `note` may also be null. */
  const freeTextFixtures = (field: 'note' | 'reason', valid: object): LayerFixture[] => [
    // Free text: stored as data through Prisma and escaped by the portal and app when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `${field} ← ${p.category}: ${p.label}`,
        input: { [field]: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. It can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { [field]: p.value },
      expected: 'PASS',
      field,
    })),
  ];

  describe('assistance requests site · approve and decline — security', () => {
    const ctx = useAssistanceRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
    });

    describe(APPROVE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, APPROVE_ENDPOINT, freeTextFixtures('note', VALID_APPROVE)));
    });

    describe(DECLINE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, DECLINE_ENDPOINT, freeTextFixtures('reason', VALID_DECLINE)));
    });
  });
}
