import {
  ListUserRequestsQuerySchema,
  REJECTION_REASON_MAX_LENGTH,
  USER_REQUESTS_MAX_LIMIT,
} from '../../../../../src/modules/user-requests/validators/user-requests-site-validator';
import {
  LayerFixture,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../../config/layer-harness';
import { fixtureCases } from '../../../../config/test-case';
import {
  ENDPOINTS,
  REJECT_ENDPOINT,
  VALID_REJECT,
  VALID_REQUEST_ID,
  describeRejectBodyTable,
  describeRequestIdTable,
  useUserRequestsApp,
} from '../user-requests-site-support';

/**
 * Users Module · User Request Decision — invalid inputs (field validation).
 *
 * Every case here is an intentionally wrong value for one field of Users → Request in
 * the portal. A case Passes when the request is refused with "Validation failed" (400)
 * on that field — and, where the schema defines one, the exact message — without
 * reaching the service. Each fixture keeps every other field valid, so the named field
 * is the only reason it can fail.
 *
 *   id      POST /api/v1/user-requests/:id/accept · /reject · /remove · /restore
 *   reason  POST /api/v1/user-requests/:id/reject                (RejectUserRequestSchema)
 *   kind    GET  /api/v1/user-requests/:id/attachments/:kind     (the proof files the
 *                                                                 director reviews)
 *   query   GET  /api/v1/user-requests                           (the queue)
 *
 * The valid cases for this unit live in ../valid/.
 */

const REQUEST_ID_REQUIRED = 'A valid request id is required';
const REASON_REQUIRED = 'Enter a reason for the rejection';
const REASON_TOO_LONG = `Keep the reason under ${REJECTION_REASON_MAX_LENGTH} characters`;
const REASON_CONTROL = 'Reason cannot contain control characters';

/** Malformed request ids, shared by every route with `:id`. */
const requestIdFixtures = (action: string): LayerFixture<string>[] => [
  { name: `Director ${action} a request id that is not a uuid`, input: 'request-1', expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} the reference number instead of the request id`, input: '10', expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} a request id missing its last character`, input: VALID_REQUEST_ID.slice(0, -1), expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} a request id with an extra character`, input: `${VALID_REQUEST_ID}0`, expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} a request id without hyphens`, input: VALID_REQUEST_ID.replace(/-/g, ''), expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} a request id with surrounding spaces`, input: ` ${VALID_REQUEST_ID} `, expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} a request id with a non-hex character`, input: `${VALID_REQUEST_ID.slice(0, -1)}g`, expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
  { name: `Director ${action} a blank request id`, input: ' ', expected: 'FAIL', field: '', message: REQUEST_ID_REQUIRED },
];

const ACTION_VERB: Record<string, string> = {
  accept: 'accepts',
  reject: 'rejects',
  remove: 'removes',
  restore: 'restores',
};

/* ── reject: reason ──────────────────────────────────────────────────────── */
const rejectFixtures: LayerFixture[] = [
  { name: 'Director rejects without giving a reason', input: {}, expected: 'FAIL', field: 'reason' },
  { name: 'Director rejects with an empty reason', input: { reason: '' }, expected: 'FAIL', field: 'reason', message: REASON_REQUIRED },
  { name: 'Director rejects with a reason of only spaces', input: { reason: '   ' }, expected: 'FAIL', field: 'reason', message: REASON_REQUIRED },
  { name: 'Director rejects with a reason of only line breaks', input: { reason: '\n\r\n' }, expected: 'FAIL', field: 'reason', message: REASON_REQUIRED },
  { name: 'Director rejects with a reason of only tabs', input: { reason: '\t\t' }, expected: 'FAIL', field: 'reason', message: REASON_REQUIRED },
  {
    name: `Director writes a reason of ${REJECTION_REASON_MAX_LENGTH + 1} characters`,
    input: { reason: 'a'.repeat(REJECTION_REASON_MAX_LENGTH + 1) },
    expected: 'FAIL',
    field: 'reason',
    message: REASON_TOO_LONG,
  },
  {
    name: 'Director pastes a non-printing character (bell) into the reason',
    input: { reason: `${VALID_REJECT.reason}\u0007` },
    expected: 'FAIL',
    field: 'reason',
    message: REASON_CONTROL,
  },
  {
    name: 'Director pastes a form-feed character into the reason',
    input: { reason: 'The ID photo\u000Cis blurred.' },
    expected: 'FAIL',
    field: 'reason',
    message: REASON_CONTROL,
  },
  {
    name: 'Director pastes a delete character into the reason',
    input: { reason: `${VALID_REJECT.reason}\u007F` },
    expected: 'FAIL',
    field: 'reason',
    message: REASON_CONTROL,
  },
  { name: 'Director sends the reason as a number', input: { reason: 404 }, expected: 'FAIL', field: 'reason' },
  { name: 'Director sends the reason as null', input: { reason: null }, expected: 'FAIL', field: 'reason' },
  { name: 'Director sends several reasons as a list', input: { reason: ['ID not readable', 'Selfie does not match'] }, expected: 'FAIL', field: 'reason' },
  { name: 'Client sends the reason as "message" instead of "reason"', input: { message: VALID_REJECT.reason }, expected: 'FAIL', field: 'reason' },
  { name: 'Client sends a field the reject form does not have (notify_requester)', input: { ...VALID_REJECT, notify_requester: false }, expected: 'FAIL' },
];

/* ── attachments: kind ───────────────────────────────────────────────────── */
const attachmentPath = (id: string, kind: string) =>
  `/api/v1/user-requests/${encodeURIComponent(id)}/attachments/${encodeURIComponent(kind)}`;

const kindFixtures: LayerFixture<string>[] = [
  { name: 'Director opens a proof file of a kind that does not exist (passport)', input: 'passport', expected: 'FAIL' },
  { name: 'Director opens a proof file kind in upper case (ID-FRONT)', input: 'ID-FRONT', expected: 'FAIL' },
  { name: 'Director opens a proof file kind with an underscore (id_front)', input: 'id_front', expected: 'FAIL' },
  { name: 'Director opens a proof file by its file name (selfie.jpg)', input: 'selfie.jpg', expected: 'FAIL' },
  { name: 'Director opens a proof file by its label (ID (front))', input: 'ID (front)', expected: 'FAIL' },
  { name: 'Director opens a proof file kind with surrounding spaces', input: ' selfie ', expected: 'FAIL' },
];

/* ── list: query ─────────────────────────────────────────────────────────── */
const queryFixtures: LayerFixture<Record<string, string>>[] = [
  { name: 'Director filters by a status that does not exist (APPROVED)', input: { status: 'APPROVED' }, expected: 'FAIL', field: 'status' },
  { name: 'Director filters by a status in lower case (pending)', input: { status: 'pending' }, expected: 'FAIL', field: 'status' },
  { name: 'Director filters by "ALL" in upper case instead of "all"', input: { status: 'ALL' }, expected: 'FAIL', field: 'status' },
  { name: 'Director sends an empty status filter', input: { status: '' }, expected: 'FAIL', field: 'status' },
  { name: 'Director filters by a request kind that does not exist (DONATION)', input: { kind: 'DONATION' }, expected: 'FAIL', field: 'kind' },
  { name: 'Director filters by a request kind in lower case (event_join)', input: { kind: 'event_join' }, expected: 'FAIL', field: 'kind' },
  { name: 'Director sends an empty kind filter', input: { kind: '' }, expected: 'FAIL', field: 'kind' },
  { name: 'Director asks for 0 requests', input: { limit: '0' }, expected: 'FAIL', field: 'limit' },
  {
    name: `Director asks for ${USER_REQUESTS_MAX_LIMIT + 1} requests, one over the maximum`,
    input: { limit: String(USER_REQUESTS_MAX_LIMIT + 1) },
    expected: 'FAIL',
    field: 'limit',
  },
  { name: 'Director asks for a negative number of requests', input: { limit: '-1' }, expected: 'FAIL', field: 'limit' },
  { name: 'Director asks for a fractional number of requests', input: { limit: '2.5' }, expected: 'FAIL', field: 'limit' },
  { name: 'Director types the limit as a word (ten)', input: { limit: 'ten' }, expected: 'FAIL', field: 'limit' },
  { name: 'Director sends an empty limit', input: { limit: '' }, expected: 'FAIL', field: 'limit' },
  { name: 'Client sends a query parameter the queue does not take (page)', input: { page: '2' }, expected: 'FAIL' },
];

describe('user requests site — field validation', () => {
  const ctx = useUserRequestsApp();

  beforeEach(() => {
    // The support resets the four POST actions; the two reads are reset here.
    ctx.service.list.mockReset().mockResolvedValue({ items: [], total: 0 } as never);
    ctx.service.getAttachment.mockReset().mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/jpeg' } as never);
  });

  describe.each(ENDPOINTS)('$title', (endpoint) => {
    describe('id', () => describeRequestIdTable(ctx, endpoint, requestIdFixtures(ACTION_VERB[endpoint.handler])));
  });

  describe(REJECT_ENDPOINT.title, () => {
    describe('reason', () => describeRejectBodyTable(ctx, rejectFixtures));
  });

  describe('GET /api/v1/user-requests/:id/attachments/:kind', () => {
    describe('id', () =>
      fixtureCases(requestIdFixtures('opens a proof file of'), (fixture) => {
        it('layer 2 — api', async () => {
          const outcome = await runApiLayer(ctx.app, { method: 'get', path: attachmentPath(fixture.input, 'selfie') });
          expectLayer(outcome, fixture);
          expectValidationEnvelope(outcome);
          expect(ctx.service.getAttachment).not.toHaveBeenCalled();
        });
      }));

    describe('kind', () =>
      fixtureCases(kindFixtures, (fixture) => {
        it('layer 2 — api', async () => {
          const outcome = await runApiLayer(ctx.app, { method: 'get', path: attachmentPath(VALID_REQUEST_ID, fixture.input) });
          expectLayer(outcome, fixture);
          expectValidationEnvelope(outcome);
          expect(ctx.service.getAttachment).not.toHaveBeenCalled();
        });
      }));
  });

  describe('GET /api/v1/user-requests', () => {
    describe('query', () =>
      fixtureCases(queryFixtures, (fixture) => {
        it('layer 1 — schema', async () => {
          expectLayer(await runSchemaLayer(ListUserRequestsQuerySchema, fixture.input), fixture);
        });

        it('layer 2 — api', async () => {
          const outcome = await runApiLayer(ctx.app, { method: 'get', path: '/api/v1/user-requests', query: fixture.input });
          expectLayer(outcome, fixture);
          expectValidationEnvelope(outcome);
          expect(ctx.service.list).not.toHaveBeenCalled();
        });
      }));
  });
});
