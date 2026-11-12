import { asCase } from '../../../../config/test-case';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  APPROVE_ENDPOINT,
  DECLINE_ENDPOINT,
  ENDPOINTS,
  useAssistanceRequestsApp,
  REQUEST_RESPONSE,
  VALID_APPROVE,
  VALID_DECLINE,
  VALID_REQUEST_ID,
  describeBodyTable,
  describeRequestIdTable,
} from '../assistance-requests-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';

/**
 * Users Module · Assistance Request Decision — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Assistance requests approve / decline — error handling: unexpected service errors and
   * a response the serializer refuses are masked as a generic 500 with nothing leaked, and
   * the service's deliberate HttpExceptions keep their status and message through the envelope.
   */
  const NOT_FOUND = new NotFoundException('Assistance request not found');
  const ALREADY_DECIDED = new ConflictException('This request is declined and can no longer be changed this way');
  const CHANGED_MEANWHILE = new ConflictException('This request was just changed by the beneficiary — refresh and try again');

  const DELIBERATE_ERRORS = [
    { title: 'approve · 404 for an unknown request', endpoint: APPROVE_ENDPOINT, error: NOT_FOUND },
    { title: 'approve · 409 from a status it cannot leave', endpoint: APPROVE_ENDPOINT, error: ALREADY_DECIDED },
    { title: 'approve · 409 when the beneficiary changed it first', endpoint: APPROVE_ENDPOINT, error: CHANGED_MEANWHILE },
    { title: 'decline · 404 for an unknown request', endpoint: DECLINE_ENDPOINT, error: NOT_FOUND },
    { title: 'decline · 409 from a status it cannot leave', endpoint: DECLINE_ENDPOINT, error: ALREADY_DECIDED },
    { title: 'decline · 409 when the beneficiary changed it first', endpoint: DECLINE_ENDPOINT, error: CHANGED_MEANWHILE },
  ];

  describe('assistance requests site · approve and decline — error handling', () => {
    const ctx = useAssistanceRequestsApp();

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
        ctx.service[endpoint.handler].mockResolvedValueOnce({ url: 'private/prescription.pdf' } as never);
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
   * Assistance requests approve / decline — input validation: the request id path param,
   * the optional approval note, and the decline reason's required, empty and length rules,
   * plus legitimate inputs that must pass.
   */
  const requestIdFixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'request-1', expected: 'FAIL', message: 'A valid assistance request id is required' },
    { name: 'uuid missing a character', input: VALID_REQUEST_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_REQUEST_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_REQUEST_ID} `, expected: 'FAIL' },
    { name: 'reference label instead of an id', input: REQUEST_RESPONSE.reference_label, expected: 'FAIL' },
    { name: 'the app route segment', input: 'me', expected: 'FAIL' },
  ];

  const approveFixtures: LayerFixture[] = [
    { name: 'note over max', input: { note: 'a'.repeat(501) }, expected: 'FAIL', field: 'note', message: 'Keep the note under 500 characters' },
  ];

  const declineFixtures: LayerFixture[] = [
    { name: 'reason missing', input: {}, expected: 'FAIL', field: 'reason' },
    { name: 'reason null', input: { reason: null }, expected: 'FAIL', field: 'reason' },
    { name: 'reason empty', input: { reason: '' }, expected: 'FAIL', field: 'reason', message: 'Say why the request is declined' },
    { name: 'reason whitespace-only', input: { reason: '   ' }, expected: 'FAIL', field: 'reason', message: 'Say why the request is declined' },
    { name: 'reason line breaks only', input: { reason: '\n\r\n' }, expected: 'FAIL', field: 'reason' },
    { name: 'reason over max', input: { reason: 'a'.repeat(501) }, expected: 'FAIL', field: 'reason', message: 'Keep the reason under 500 characters' },
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
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Assistance requests approve / decline — security: hostile strings in the id path param
   * (a uuid, so all must FAIL), per-class payloads in the note and the reason, type
   * confusion, mass assignment, prototype pollution and malformed JSON.
   */
  const requestIdFixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `id ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'id ← uuid with SQL tail', input: `${VALID_REQUEST_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'id ← uuid with stacked query', input: `${VALID_REQUEST_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  /** The two free-text fields hold to one rule; only `note` may also be null. */
  const freeTextFixtures = (field: 'note' | 'reason', valid: object): LayerFixture[] => [
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. It can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { [field]: p.value },
      expected: 'FAIL',
      field,
    })),
    ...OPERATOR_INJECTION_PAYLOADS.filter((p) => field === 'reason' || p.value !== null).map((p): LayerFixture => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { [field]: p.value },
      expected: 'FAIL',
      field,
    })),
    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...valid, ...extra },
      expected: 'FAIL',
    })),
    // The outcome is the action's own, and the request belongs to its beneficiary.
    { name: 'mass assignment: status', input: { ...valid, status: 'COMPLETED' }, expected: 'FAIL' },
    { name: 'mass assignment: status_note', input: { ...valid, status_note: 'Overwritten' }, expected: 'FAIL' },
    { name: 'mass assignment: requester_id', input: { ...valid, requester_id: VALID_REQUEST_ID }, expected: 'FAIL' },
    { name: 'mass assignment: decided_at', input: { ...valid, decided_at: '2026-10-30T08:00:00.000Z' }, expected: 'FAIL' },
  ];

  describe('assistance requests site · approve and decline — security', () => {
    const ctx = useAssistanceRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describe('id', () => describeRequestIdTable(ctx, endpoint, requestIdFixtures));

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(endpoint.schema, { ...endpoint.validBody, status: 'COMPLETED' });
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
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), rawBody: '{"reason":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      });
    });

    describe(APPROVE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, APPROVE_ENDPOINT, freeTextFixtures('note', VALID_APPROVE)));
    });

    describe(DECLINE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, DECLINE_ENDPOINT, freeTextFixtures('reason', VALID_DECLINE)));
    });
  });
}
