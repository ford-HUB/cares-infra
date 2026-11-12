import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  READ_ENDPOINT,
  SEND_ENDPOINT,
  VALID_CONTACT_ID,
  VALID_MESSAGE,
  describeContactIdTable,
  describeMessageBodyTable,
  useChatApp,
  sendPath,
} from '../chat-site-support';
import { asCase } from '../../../../config/test-case';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Chat Module · Send Message / Mark Read — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Chat — input validation: the contactId path param on both POSTs, and the
   * sendMessage body's default, length bound and legitimate shapes.
   */
  const contactIdFixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_CONTACT_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_CONTACT_ID.toUpperCase(), expected: 'PASS' },
  ];

  // `body` is free text. Empty and whitespace-only pass the schema on purpose: the
  // message may be attachments only, and the service enforces "text or attachment".
  const bodyFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_MESSAGE, expected: 'PASS' },
    { name: 'body missing (defaults to empty)', input: {}, expected: 'PASS' },
    { name: 'body empty', input: { body: '' }, expected: 'PASS' },
    { name: 'body whitespace-only', input: { body: '   ' }, expected: 'PASS' },
    { name: 'body at max length', input: { body: 'a'.repeat(2000) }, expected: 'PASS' },
    { name: 'body at max once trimmed', input: { body: `   ${'a'.repeat(2000)}   ` }, expected: 'PASS' },
    // The portal posts multipart form data, which encodes every line break as CRLF.
    { name: 'body with CRLF line breaks', input: { body: 'Line one\r\nLine two\r\nLine three' }, expected: 'PASS' },
    { name: 'body with emoji and accents', input: { body: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  describe('chat site — input validation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      describe('contactId', () => describeContactIdTable(ctx, SEND_ENDPOINT, contactIdFixtures));
      describe('body', () => describeMessageBodyTable(ctx, bodyFixtures));
    });

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      describe('contactId', () => describeContactIdTable(ctx, READ_ENDPOINT, contactIdFixtures));
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Chat — normalisation: the message body is trimmed and defaulted by the
   * schema, and markRead passes only the validated contactId — a stray body is
   * never forwarded.
   */
  describe('chat site — normalisation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      asCase('valid', 'Staff submits a valid request').it('passes the trimmed body and contactId to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: sendPath(VALID_CONTACT_ID),
          body: { body: `  ${VALID_MESSAGE.body}  ` },
        });
        expect(ctx.service.sendMessage).toHaveBeenCalledTimes(1);
        const [, contactId, data] = ctx.service.sendMessage.mock.calls[0];
        expect(contactId).toBe(VALID_CONTACT_ID);
        expect(data).toEqual({ body: VALID_MESSAGE.body });
      });

      asCase('valid', 'Staff leaves the optional fields out').it('defaults a missing body to an empty string', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: sendPath(VALID_CONTACT_ID), body: {} });
        expect(ctx.service.sendMessage.mock.calls[0][2]).toEqual({ body: '' });
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  const bodyFixtures: LayerFixture[] = [
    // Free text: stored as data through Prisma and escaped by the portal when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `body ← ${p.category}: ${p.label}`,
        input: { body: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters other than
    // the CRLF line breaks multipart encoding produces must not get through.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `body ← ${p.category}: ${p.label}`,
      input: { body: p.value },
      expected: 'PASS',
      field: 'body',
    })),
  ];

  describe('chat site — security', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      describe('body', () => describeMessageBodyTable(ctx, bodyFixtures));
    });
  });
}
