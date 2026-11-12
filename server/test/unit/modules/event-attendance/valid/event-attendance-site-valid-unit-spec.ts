import { asCase } from '../../../../config/test-case';
import { MANUAL_ATTENDANCE_MAX_ROWS, MANUAL_ATTENDANCE_REASON_MAX } from '../../../../../src/modules/event-attendance/validators/event-attendance-site-validator';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  MANUAL_ATTENDANCE_PATH,
  MARK_RESPONSE,
  OTHER_ATTENDANCE_ID,
  VALID_ATTENDANCE_ID,
  VALID_MARK,
  describeMarkTable,
  useEventAttendanceApp,
  ATTENDEE_RESPONSE,
  CALLER,
} from '../event-attendance-site-support';
import { AttendanceStatus, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { EventAttendanceSiteService } from '../../../../../src/modules/event-attendance/services/event-attendance-site-service';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Event Attendees Module · Manual Attendance — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Mark Present — input validation: the selected attendance ids and their row limit, and
   * the optional reason's length, plus legitimate inputs that must pass.
   */
  const ids = { event_attendance_ids: [VALID_ATTENDANCE_ID] };

  const fixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_MARK, expected: 'PASS' },
    { name: 'reason omitted', input: ids, expected: 'PASS' },
    { name: 'several ids', input: { event_attendance_ids: [VALID_ATTENDANCE_ID, OTHER_ATTENDANCE_ID] }, expected: 'PASS' },
    { name: 'upper-case id', input: { event_attendance_ids: [VALID_ATTENDANCE_ID.toUpperCase()] }, expected: 'PASS' },
    { name: 'the same id twice', input: { event_attendance_ids: [VALID_ATTENDANCE_ID, VALID_ATTENDANCE_ID] }, expected: 'PASS' },
    {
      name: 'ids at the row limit',
      input: { event_attendance_ids: Array(MANUAL_ATTENDANCE_MAX_ROWS).fill(VALID_ATTENDANCE_ID) },
      expected: 'PASS',
    },

    { name: 'reason empty', input: { ...ids, reason: '' }, expected: 'PASS' },
    { name: 'reason whitespace-only', input: { ...ids, reason: '   ' }, expected: 'PASS' },
    { name: 'reason at max length', input: { ...ids, reason: 'a'.repeat(MANUAL_ATTENDANCE_REASON_MAX) }, expected: 'PASS' },
    { name: 'reason at max once trimmed', input: { ...ids, reason: `   ${'a'.repeat(MANUAL_ATTENDANCE_REASON_MAX)}   ` }, expected: 'PASS' },
    { name: 'reason with line breaks', input: { ...ids, reason: 'Line one\nLine two' }, expected: 'PASS' },
    { name: 'reason with accents and emoji', input: { ...ids, reason: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  describe('event attendance site · mark present — input validation', () => {
    const ctx = useEventAttendanceApp();

    describe(`POST ${MANUAL_ATTENDANCE_PATH}`, () => {
      describeMarkTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('wraps the ruling in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: MANUAL_ATTENDANCE_PATH, body: VALID_MARK });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Attendance marked', data: MARK_RESPONSE });
      });
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
      asCase('valid', 'Staff submits a valid request').it('passes the caller, the body and the request context to the service', async () => {
        await send(VALID_MARK, { 'User-Agent': 'portal-browser' });
        expect(ctx.service.markPresentManually).toHaveBeenCalledTimes(1);
        expect(ctx.service.markPresentManually).toHaveBeenCalledWith(
          CALLER,
          VALID_MARK,
          expect.objectContaining({ userAgent: 'portal-browser', ipAddress: expect.any(String) }),
        );
      });

      asCase('valid', 'Staff enters the reason with surrounding spaces').it('trims the reason', async () => {
        await send({ ...VALID_MARK, reason: `  ${VALID_MARK.reason}\n  ` });
        expect(ctx.service.markPresentManually.mock.calls[0][1].reason).toBe(VALID_MARK.reason);
      });

      asCase('valid', 'Staff enters a reason spanning several lines').it('keeps line breaks inside the reason', async () => {
        const reason = 'Line one\n\nLine three';
        await send({ ...VALID_MARK, reason });
        expect(ctx.service.markPresentManually.mock.calls[0][1].reason).toBe(reason);
      });

      asCase('valid', 'Staff leaves the reason out, empty or blank', 'A reason left out, empty or blank is treated as no reason').it.each([
        { title: 'left out', extra: {} },
        { title: 'empty', extra: { reason: '' } },
        { title: 'whitespace-only', extra: { reason: '   ' } },
      ])('treats a reason that is $title as no reason', async ({ extra }) => {
        await send({ event_attendance_ids: VALID_MARK.event_attendance_ids, ...extra });
        expect(ctx.service.markPresentManually.mock.calls[0][1].reason).toBeUndefined();
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps fields outside the response schema off the wire', async () => {
        ctx.service.markPresentManually.mockResolvedValueOnce({
          ...MARK_RESPONSE,
          marked: [{ ...ATTENDEE_RESPONSE, password_hash: 'stored-hash', accounts: [{ email: 'ada@cares.ph' }] }],
        } as never);
        const outcome = await send(VALID_MARK);
        expect(outcome.status).toBe(201);
        expect(outcome.body.data).toEqual(MARK_RESPONSE);
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

    // Free text: stored as data through Prisma and escaped by the portal when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `reason ← ${p.category}: ${p.label}`,
        input: { ...ids, reason: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...ids, reason: p.value },
      expected: 'PASS',
      field: 'reason',
    })),
  ];

  describe('event attendance site · mark present — security', () => {
    const ctx = useEventAttendanceApp();

    describe(`POST ${MANUAL_ATTENDANCE_PATH}`, () => {
      describeMarkTable(ctx, fixtures);
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

      asCase('valid', 'Staff marks a volunteer present with a reason').it('credits the event window once, as a manual ruling with a reason', async () => {
        const { service, repository, validation } = build([row()]);
        await mark(service, CALLER, VALID_MARK);
        expect(repository.applyManualPresence).toHaveBeenCalledTimes(1);
        expect(repository.applyManualPresence).toHaveBeenCalledWith(VALID_ATTENDANCE_ID, {
          hours_rendered: 4,
          remarks: `Marked present manually: ${VALID_MARK.reason}`,
        });
        expect(validation.notifyRuling).toHaveBeenCalledTimes(1);
      });

      asCase('valid', 'Staff marks a volunteer present without a reason').it('explains the ruling in the remarks when no reason is given', async () => {
        const { service, repository } = build([row()]);
        await mark(service);
        expect(repository.applyManualPresence.mock.calls[0][1].remarks).toBe(
          'Marked present manually (geofence attendance unavailable)',
        );
      });

      asCase('valid', 'Staff marks an absent volunteer present').it('credits an absent volunteer too, since the geofence may be why they are absent', async () => {
        const { service, repository } = build([row({ status: AttendanceStatus.ABSENT })]);
        await mark(service);
        expect(repository.applyManualPresence).toHaveBeenCalledTimes(1);
      });

      asCase('valid', 'Director marks volunteers from any college').it('does not hold a director to a college', async () => {
        const { service, repository } = build([row({ event: { ...ENDED_EVENT, department: 'College of Maritime Engineering' } })]);
        await mark(service);
        expect(repository.findUserDepartment).not.toHaveBeenCalled();
        expect(repository.applyManualPresence).toHaveBeenCalledTimes(1);
      });

      asCase('valid', 'Coordinator marks volunteers from their own college').it('lets a coordinator rule on their own college, under any of its names', async () => {
        const { service, repository } = build([row()], 'College of Nursing & Allied Health Sciences');
        await mark(service, COORDINATOR);
        expect(repository.findUserDepartment).toHaveBeenCalledWith(COORDINATOR.sub);
        expect(repository.applyManualPresence).toHaveBeenCalledTimes(1);
      });

      asCase('valid', 'Staff marks a volunteer present').it('writes who ruled, from where and why to the audit trail', async () => {
        const { service, audit } = build([row()]);
        await mark(service, CALLER, VALID_MARK, { ipAddress: '203.0.113.10', userAgent: 'portal-browser' });
        expect(audit.record).toHaveBeenCalledTimes(1);
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'attendance.manually-marked',
            severity: 'NOTICE',
            actor: CALLER,
            reason: VALID_MARK.reason,
            ipAddress: '203.0.113.10',
            userAgent: 'portal-browser',
          }),
        );
      });
    });
  });
}
