import { asCase } from '../../../../config/test-case';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  MANUAL_ATTENDANCE_PATH,
  VALID_MARK,
  useEventAttendanceApp,
  OTHER_ATTENDANCE_ID,
  VALID_ATTENDANCE_ID,
  describeMarkTable,
  CALLER,
} from '../event-attendance-site-support';
import { MANUAL_ATTENDANCE_MAX_ROWS, MANUAL_ATTENDANCE_REASON_MAX, ManualAttendanceSchema } from '../../../../../src/modules/event-attendance/validators/event-attendance-site-validator';
import { AttendanceStatus, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { EventAttendanceSiteService } from '../../../../../src/modules/event-attendance/services/event-attendance-site-service';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';

/**
 * Event Attendees Module · Manual Attendance — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Mark Present — error handling: unexpected service errors and a response the serializer
   * refuses are masked as a generic 500 with nothing leaked, and the service's deliberate
   * HttpExceptions keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: '404 when a selected row is gone', error: new NotFoundException('Some of the selected participants could not be found') },
    {
      title: '400 when an event has not ended',
      error: new BadRequestException('"Coastal Clean-up Drive" has not ended yet — attendance can be marked manually once it is over'),
    },
    { title: '403 for another college\'s event', error: new ForbiddenException('"Coastal Clean-up Drive" is not one of your college\'s events') },
    { title: '403 for a coordinator with no college', error: new ForbiddenException('Your profile has no college set, so you cannot mark attendance') },
  ];

  describe('event attendance site · mark present — error handling', () => {
    const ctx = useEventAttendanceApp();

    describe(`POST ${MANUAL_ATTENDANCE_PATH}`, () => {
      const mark = () => runApiLayer(ctx.app, { method: 'post', path: MANUAL_ATTENDANCE_PATH, body: VALID_MARK });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.markPresentManually.mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await mark();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service.markPresentManually.mockResolvedValueOnce({ marked: 'not-a-list' } as never);
        const outcome = await mark();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ error }) => {
        ctx.service.markPresentManually.mockRejectedValueOnce(error as never);
        const outcome = await mark();
        expect(outcome.status).toBe(error.getStatus());
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe(error.message);
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Mark Present — input validation: the selected attendance ids and their row limit, and
   * the optional reason's length, plus legitimate inputs that must pass.
   */
  const ids = { event_attendance_ids: [VALID_ATTENDANCE_ID] };

  const fixtures: LayerFixture[] = [

    { name: 'ids missing', input: { reason: VALID_MARK.reason }, expected: 'FAIL', field: 'event_attendance_ids' },
    { name: 'ids empty', input: { event_attendance_ids: [] }, expected: 'FAIL', field: 'event_attendance_ids', message: 'Select at least one participant' },
    {
      name: 'ids over the row limit',
      input: { event_attendance_ids: Array(MANUAL_ATTENDANCE_MAX_ROWS + 1).fill(VALID_ATTENDANCE_ID) },
      expected: 'FAIL',
      field: 'event_attendance_ids',
    },
    { name: 'id not a uuid', input: { event_attendance_ids: ['attendance-1'] }, expected: 'FAIL', field: 'event_attendance_ids.0' },
    { name: 'id missing a character', input: { event_attendance_ids: [VALID_ATTENDANCE_ID.slice(0, -1)] }, expected: 'FAIL', field: 'event_attendance_ids.0' },
    { name: 'id without hyphens', input: { event_attendance_ids: [VALID_ATTENDANCE_ID.replace(/-/g, '')] }, expected: 'FAIL', field: 'event_attendance_ids.0' },
    { name: 'id with surrounding spaces', input: { event_attendance_ids: [` ${VALID_ATTENDANCE_ID} `] }, expected: 'FAIL', field: 'event_attendance_ids.0' },
    { name: 'id empty', input: { event_attendance_ids: [''] }, expected: 'FAIL', field: 'event_attendance_ids.0' },
    { name: 'a bad id after a good one', input: { event_attendance_ids: [VALID_ATTENDANCE_ID, 'attendance-1'] }, expected: 'FAIL', field: 'event_attendance_ids.1' },
    { name: 'one id instead of a list', input: { event_attendance_ids: VALID_ATTENDANCE_ID }, expected: 'FAIL', field: 'event_attendance_ids' },
    { name: 'reason over max', input: { ...ids, reason: 'a'.repeat(MANUAL_ATTENDANCE_REASON_MAX + 1) }, expected: 'FAIL', field: 'reason' },
  ];

  describe('event attendance site · mark present — input validation', () => {
    const ctx = useEventAttendanceApp();

    describe(`POST ${MANUAL_ATTENDANCE_PATH}`, () => {
      describeMarkTable(ctx, fixtures);
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Mark Present — normalisation: the schema drops repeated ids and trims the reason, a
   * blank reason counts as none, the service receives that with the caller and where the
   * request came from, and only the response schema's fields leave the server.
   */
  describe('event attendance site · mark present — normalisation', () => {
    const ctx = useEventAttendanceApp();

    const send = (body: object, headers?: Record<string, string>) =>
      runApiLayer(ctx.app, { method: 'post', path: MANUAL_ATTENDANCE_PATH, body, headers });

    describe(`POST ${MANUAL_ATTENDANCE_PATH}`, () => {

      asCase('invalid', 'Staff sends the same volunteer id twice in one request').it('drops repeated ids, so one person cannot be credited twice in a request', async () => {
        await send({ event_attendance_ids: [VALID_ATTENDANCE_ID, OTHER_ATTENDANCE_ID, VALID_ATTENDANCE_ID] });
        expect(ctx.service.markPresentManually.mock.calls[0][1].event_attendance_ids).toEqual([
          VALID_ATTENDANCE_ID,
          OTHER_ATTENDANCE_ID,
        ]);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Mark Present — security, per field class:
   *   event_attendance_ids  uuids: every hostile string FAILs
   *   reason                free text, trimmed: control characters FAIL, line breaks stay
   * plus type confusion, mass assignment, prototype pollution, and the rules in the real
   * service that decide who may credit service hours, and how many.
   */
  const ids = { event_attendance_ids: [VALID_ATTENDANCE_ID] };

  const fixtures: LayerFixture[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `event_attendance_ids ← ${p.category}: ${p.label}`,
      input: { event_attendance_ids: [p.value] },
      expected: 'FAIL',
      field: 'event_attendance_ids.0',
    })),
    {
      name: 'event_attendance_ids ← uuid with SQL tail',
      input: { event_attendance_ids: [`${VALID_ATTENDANCE_ID}' OR '1'='1`] },
      expected: 'FAIL',
      field: 'event_attendance_ids.0',
    },
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `event_attendance_ids ← ${p.category}: ${p.label}`,
      input: { event_attendance_ids: p.value },
      expected: 'FAIL',
      field: Array.isArray(p.value) ? 'event_attendance_ids.0' : 'event_attendance_ids',
    })),
    // Each id in the list is its own target, so an operator must not stand in for one.
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `event_attendance_ids[0] ← ${p.category}: ${p.label}`,
      input: { event_attendance_ids: [p.value] },
      expected: 'FAIL',
      field: 'event_attendance_ids.0',
    })),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...ids, reason: p.value },
      expected: 'FAIL',
      field: 'reason',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...ids, reason: p.value },
      expected: 'FAIL',
      field: 'reason',
    })),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_MARK, ...extra },
      expected: 'FAIL',
    })),
    // The server works out the hours and writes the ruling; none of it can be supplied.
    { name: 'mass assignment: hours_rendered', input: { ...VALID_MARK, hours_rendered: 999 }, expected: 'FAIL' },
    { name: 'mass assignment: status', input: { ...VALID_MARK, status: 'COMPLETED' }, expected: 'FAIL' },
    { name: 'mass assignment: validation_method', input: { ...VALID_MARK, validation_method: 'GEOFENCE' }, expected: 'FAIL' },
    { name: 'mass assignment: remarks', input: { ...VALID_MARK, remarks: 'Overwritten' }, expected: 'FAIL' },
    { name: 'mass assignment: event_id', input: { ...VALID_MARK, event_id: 1 }, expected: 'FAIL' },
  ];

  describe('event attendance site · mark present — security', () => {
    const ctx = useEventAttendanceApp();

    describe(`POST ${MANUAL_ATTENDANCE_PATH}`, () => {
      describeMarkTable(ctx, fixtures);

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(ManualAttendanceSchema, { ...VALID_MARK, hours_rendered: 999 });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: MANUAL_ATTENDANCE_PATH,
          rawBody: withPollution(VALID_MARK, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.markPresentManually).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: MANUAL_ATTENDANCE_PATH, rawBody: '{"reason":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.markPresentManually).not.toHaveBeenCalled();
      });
    });

    // The controller's service is mocked above; who may rule, and on what, lives in the real one.
    describe('markPresentManually (real service)', () => {
      const NURSING = 'College of Nursing';
      const COORDINATOR = { sub: 'coordinator-user-id', role_type: RoleType.COORDINATOR };
      const ENDED_EVENT = {
        event_id: 1,
        title: 'Coastal Clean-up Drive',
        event_started: new Date('2026-10-30T01:00:00.000Z'),
        event_ended: new Date('2026-10-30T05:00:00.000Z'),
        department: NURSING,
      };

      const row = (overrides: object = {}) => ({
        event_attendance_id: VALID_ATTENDANCE_ID,
        user_id: 'volunteer-user-id',
        status: AttendanceStatus.PENDING,
        participation_role: 'REGULAR',
        role_approval: 'NOT_REQUIRED',
        event: ENDED_EVENT,
        ...overrides,
      });

      const build = (rows: object[], profileDepartment: string | null = NURSING) => {
        const repository = autoMock<any>({
          findForManualMark: jest.fn().mockResolvedValue(rows),
          findUserDepartment: jest.fn().mockResolvedValue({ portal_department: profileDepartment }),
          applyManualPresence: jest.fn().mockResolvedValue(true),
          findRosterByIds: jest.fn().mockResolvedValue([]),
        });
        const validation = autoMock<any>();
        const audit = autoMock<any>();
        const service = new EventAttendanceSiteService(repository, validation, audit);
        return { service, repository, validation, audit };
      };

      const mark = (service: EventAttendanceSiteService, caller: object = CALLER, body: object = ids, context: object = {}) =>
        service.markPresentManually(caller as never, body as never, context);

      asCase('invalid', 'Staff marks a volunteer who is already present').it('never credits a completed row twice', async () => {
        const { service, repository, validation, audit } = build([row({ status: AttendanceStatus.COMPLETED })]);
        await expect(mark(service)).resolves.toEqual({ marked: [], already_completed: 1 });
        expect(repository.applyManualPresence).not.toHaveBeenCalled();
        expect(validation.notifyRuling).not.toHaveBeenCalled();
        expect(audit.record).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Two staff mark the same volunteer present at the same time').it('counts a row another ruling completed first as already completed', async () => {
        const { service, repository, validation } = build([row()]);
        repository.applyManualPresence.mockResolvedValue(false);
        await expect(mark(service)).resolves.toEqual({ marked: [], already_completed: 1 });
        expect(validation.notifyRuling).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Staff submits a batch where one id does not exist').it('refuses the whole request when one id does not exist', async () => {
        const { service, repository } = build([row()]);
        const body = { event_attendance_ids: [VALID_ATTENDANCE_ID, OTHER_ATTENDANCE_ID] };
        await expect(mark(service, CALLER, body)).rejects.toEqual(
          new NotFoundException('Some of the selected participants could not be found'),
        );
        expect(repository.applyManualPresence).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Staff submits a batch where one event has not ended').it('refuses the whole request when one event has not ended', async () => {
        const running = { ...ENDED_EVENT, title: 'Still Running', event_ended: new Date(Date.now() + 3_600_000) };
        const { service, repository } = build([row(), row({ event_attendance_id: OTHER_ATTENDANCE_ID, event: running })]);
        const body = { event_attendance_ids: [VALID_ATTENDANCE_ID, OTHER_ATTENDANCE_ID] };
        await expect(mark(service, CALLER, body)).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.applyManualPresence).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Coordinator marks attendance on another college’s event, or one with no college', 'Refused; nothing is credited').it.each([
        { title: 'another college', event: { ...ENDED_EVENT, department: 'College of Maritime Engineering' } },
        { title: 'no college', event: { ...ENDED_EVENT, department: null } },
      ])('refuses a coordinator ruling on an event of $title', async ({ event }) => {
        const { service, repository } = build([row({ event })]);
        await expect(mark(service, COORDINATOR)).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.applyManualPresence).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Staff submits a batch where one row belongs to another college').it('refuses the whole request when one row belongs to another college', async () => {
        const { service, repository } = build([
          row(),
          row({ event_attendance_id: OTHER_ATTENDANCE_ID, event: { ...ENDED_EVENT, department: 'College of Maritime Engineering' } }),
        ]);
        const body = { event_attendance_ids: [VALID_ATTENDANCE_ID, OTHER_ATTENDANCE_ID] };
        await expect(mark(service, COORDINATOR, body)).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.applyManualPresence).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Coordinator with no college on their profile marks attendance').it.each([null, '   '])('refuses a coordinator whose profile college is %j', async (department) => {
        const { service, repository } = build([row()], department);
        await expect(mark(service, COORDINATOR)).rejects.toEqual(
          new ForbiddenException('Your profile has no college set, so you cannot mark attendance'),
        );
        expect(repository.applyManualPresence).not.toHaveBeenCalled();
      });
    });
  });
}
