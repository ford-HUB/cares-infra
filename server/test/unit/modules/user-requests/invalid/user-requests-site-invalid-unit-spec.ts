import { asCase } from '../../../../config/test-case';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  ACCEPT_ENDPOINT,
  ENDPOINTS,
  REJECT_ENDPOINT,
  REMOVE_ENDPOINT,
  RESTORE_ENDPOINT,
  useUserRequestsApp,
  VALID_REJECT,
  VALID_REQUEST_ID,
  describeRejectBodyTable,
  describeRequestIdTable,
  BODYLESS_ENDPOINTS,
  CALLER,
} from '../user-requests-site-support';
import { REJECTION_REASON_MAX_LENGTH, RejectUserRequestSchema } from '../../../../../src/modules/user-requests/validators/user-requests-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';

/**
 * Users Module · User Request Decision — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * User requests POST actions — error handling: unexpected service errors and a response
   * the serializer refuses are masked as a generic 500 with nothing leaked, and the
   * service's deliberate HttpExceptions keep their status and message through the envelope.
   */
  const NOT_FOUND = new NotFoundException('Request not found');

  const DELIBERATE_ERRORS = [
    { title: 'accept · 404 for an unknown request', endpoint: ACCEPT_ENDPOINT, error: NOT_FOUND },
    { title: 'accept · 400 for a decided request', endpoint: ACCEPT_ENDPOINT, error: new BadRequestException('This request has already been decided') },
    { title: 'accept · 400 for a closed event', endpoint: ACCEPT_ENDPOINT, error: new BadRequestException('This event is no longer open') },
    { title: 'reject · 404 for an unknown request', endpoint: REJECT_ENDPOINT, error: NOT_FOUND },
    {
      title: 'reject · 400 for a kind that takes no reason',
      endpoint: REJECT_ENDPOINT,
      error: new BadRequestException('Only event applications, event roles and beneficiary registrations can be rejected with a reason'),
    },
    { title: 'remove · 404 for an unknown request', endpoint: REMOVE_ENDPOINT, error: NOT_FOUND },
    { title: 'remove · 400 for a decided request', endpoint: REMOVE_ENDPOINT, error: new BadRequestException('Only pending requests can be removed') },
    {
      title: 'remove · 400 for a beneficiary registration',
      endpoint: REMOVE_ENDPOINT,
      error: new BadRequestException('Approve or reject a beneficiary registration instead of removing it'),
    },
    { title: 'restore · 404 for an unknown request', endpoint: RESTORE_ENDPOINT, error: NOT_FOUND },
    { title: 'restore · 400 for a request not removed', endpoint: RESTORE_ENDPOINT, error: new BadRequestException('Only removed requests can be restored') },
    {
      title: 'restore · 400 when the volunteer has left the event',
      endpoint: RESTORE_ENDPOINT,
      error: new BadRequestException('The volunteer is no longer registered for this event'),
    },
  ];

  describe('user requests site · POST actions — error handling', () => {
    const ctx = useUserRequestsApp();

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
        ctx.service[endpoint.handler].mockResolvedValueOnce({ id_front_url: 'private/id-front.jpg' } as never);
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
   * User requests POST actions — input validation: the request id path param, and the
   * reject reason's required, empty and length rules plus legitimate inputs that must pass.
   */
  const requestIdFixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'request-1', expected: 'FAIL', message: 'A valid request id is required' },
    { name: 'uuid missing a character', input: VALID_REQUEST_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_REQUEST_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_REQUEST_ID} `, expected: 'FAIL' },
    { name: 'reference number instead of an id', input: '10', expected: 'FAIL' },
  ];

  const rejectFixtures: LayerFixture[] = [
    { name: 'reason missing', input: {}, expected: 'FAIL', field: 'reason' },
    { name: 'reason empty', input: { reason: '' }, expected: 'FAIL', field: 'reason', message: 'Enter a reason for the rejection' },
    { name: 'reason whitespace-only', input: { reason: '   ' }, expected: 'FAIL', field: 'reason', message: 'Enter a reason for the rejection' },
    { name: 'reason line breaks only', input: { reason: '\n\r\n' }, expected: 'FAIL', field: 'reason' },
    {
      name: 'reason over max',
      input: { reason: 'a'.repeat(REJECTION_REASON_MAX_LENGTH + 1) },
      expected: 'FAIL',
      field: 'reason',
      message: `Keep the reason under ${REJECTION_REASON_MAX_LENGTH} characters`,
    },
  ];

  describe('user requests site · POST actions — input validation', () => {
    const ctx = useUserRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describe('id', () => describeRequestIdTable(ctx, endpoint, requestIdFixtures));
    });

    describe(REJECT_ENDPOINT.title, () => {
      describe('body', () => describeRejectBodyTable(ctx, rejectFixtures));
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

      asCase('invalid', 'Client sends body fields the endpoint does not accept').it('ignores a body it does not read', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: { sub: 'someone-else', status: 'ACCEPTED' } });
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledWith(VALID_REQUEST_ID, CALLER.sub);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * User requests POST actions — security: hostile strings in the id path param (a uuid,
   * so all must FAIL), per-class payloads in the reject reason, type confusion, mass
   * assignment, prototype pollution and malformed JSON.
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

  const rejectFixtures: LayerFixture[] = [
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { reason: p.value },
      expected: 'FAIL',
      field: 'reason',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { reason: p.value },
      expected: 'FAIL',
      field: 'reason',
    })),
    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_REJECT, ...extra },
      expected: 'FAIL',
    })),
    // The decider is always the caller, and the outcome is the action's own.
    { name: 'mass assignment: status', input: { ...VALID_REJECT, status: 'ACCEPTED' }, expected: 'FAIL' },
    { name: 'mass assignment: decided_by_user_id', input: { ...VALID_REJECT, decided_by_user_id: VALID_REQUEST_ID }, expected: 'FAIL' },
    { name: 'mass assignment: requester_id', input: { ...VALID_REJECT, requester_id: VALID_REQUEST_ID }, expected: 'FAIL' },
    { name: 'mass assignment: requested_role', input: { ...VALID_REJECT, requested_role: 'ADMIN' }, expected: 'FAIL' },
  ];

  describe('user requests site · POST actions — security', () => {
    const ctx = useUserRequestsApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describe('id', () => describeRequestIdTable(ctx, endpoint, requestIdFixtures));

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), rawBody: '{"reason":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      });
    });

    describe(REJECT_ENDPOINT.title, () => {
      describe('body', () => describeRejectBodyTable(ctx, rejectFixtures));

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(RejectUserRequestSchema, { ...VALID_REJECT, status: 'ACCEPTED' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: REJECT_ENDPOINT.path(),
          rawBody: withPollution(VALID_REJECT, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.reject).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });

    describe.each(BODYLESS_ENDPOINTS)('$title', (endpoint) => {
      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'The body changes nothing; Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('a pollution body changes nothing: $label', async (p) => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), rawBody: p.value as string });
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledWith(VALID_REQUEST_ID, CALLER.sub);
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });
  });
}
