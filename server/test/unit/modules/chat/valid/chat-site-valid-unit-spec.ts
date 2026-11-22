import { LayerFixture } from '../../../../config/layer-harness';
import { asCase } from '../../../../config/test-case';
import {
  ALLOWED_FILES,
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_MESSAGE_MAX_LENGTH,
  PDF_FILE,
  PORTAL_ROLES,
  VALID_BODY,
  VALID_CONTACT_ID,
  chatFile,
  describeBodyTable,
  describeContactIdTable,
  expectMarkedRead,
  expectMessageSent,
  markRead,
  sendMessage,
  storedContact,
  useChatApp,
} from '../chat-site-support';

/**
 * Chat Module · Send Message / Mark Read — valid inputs (field validation).
 *
 * Every case here is a legitimate value for a field of the two chat POSTs, and
 * the system must accept it. The invalid cases for this unit live in ../invalid/.
 */

/* ── Send Message ────────────────────────────────────────────────────────── */
{
  const contactIdFixtures: LayerFixture<string>[] = [
    { name: 'Staff messages a contact by their user id', input: VALID_CONTACT_ID, expected: 'PASS' },
    { name: 'Staff messages a contact whose id is in upper case', input: VALID_CONTACT_ID.toUpperCase(), expected: 'PASS' },
  ];

  // Every fixture is sent with one PDF attached, so a blank body is allowed here.
  const bodyFixtures: LayerFixture<Record<string, string>>[] = [
    { name: 'Staff types a one-line message', input: { body: VALID_BODY }, expected: 'PASS' },
    { name: 'Staff types a one-character message', input: { body: 'k' }, expected: 'PASS' },
    {
      name: `Staff types a message of exactly ${CHAT_MESSAGE_MAX_LENGTH} characters`,
      input: { body: 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH) },
      expected: 'PASS',
    },
    // The portal posts multipart form data, which encodes every line break as CRLF.
    { name: 'Staff types a message over several lines', input: { body: 'Line one\r\nLine two\nLine three' }, expected: 'PASS' },
    { name: 'Staff types a message with tabs', input: { body: 'Item\tQty\tUnit' }, expected: 'PASS' },
    { name: 'Staff types a message with accents and emoji', input: { body: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
    { name: 'Staff types a message with punctuation and quotes', input: { body: `Can't make it — "Room 3" at 2:30 (maybe 3:00)?` }, expected: 'PASS' },
    { name: 'Staff sends only attachments, leaving the text box out', input: {}, expected: 'PASS' },
    { name: 'Staff sends only attachments with an empty text box', input: { body: '' }, expected: 'PASS' },
  ];

  describe('chat site — Send Message field validation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      describe('contactId', () => describeContactIdTable(ctx, 'send', contactIdFixtures));

      describe('contactId', () => {
        asCase(
          'valid',
          `Staff messages a contact of every portal role (${PORTAL_ROLES.length} variants)`,
          'Message sent (201) and stored once in the conversation with that contact',
        ).it.each(PORTAL_ROLES)('accepts a %s contact', async (role) => {
          ctx.repository.findContact.mockResolvedValue(storedContact(role) as never);
          const outcome = await sendMessage(ctx, { body: VALID_BODY });
          expectMessageSent(ctx, outcome, VALID_BODY);
          expect(ctx.repository.findOrCreateConversation).toHaveBeenCalledWith(expect.any(String), VALID_CONTACT_ID);
        });
      });

      describe('body', () => describeBodyTable(ctx, bodyFixtures));

      describe('body', () => {
        asCase('valid', 'Staff sends a text-only message', 'Message sent (201) with the text and no attachments').it(
          'stores the text with no attachments',
          async () => {
            const outcome = await sendMessage(ctx, { body: VALID_BODY });
            expectMessageSent(ctx, outcome, VALID_BODY);
          },
        );
      });

      describe('files', () => {
        asCase('valid', 'Staff sends one attachment with no text', 'Message sent (201) with an empty text and the one attachment').it(
          'stores the attachment with an empty text',
          async () => {
            const outcome = await sendMessage(ctx, {}, [PDF_FILE]);
            expectMessageSent(ctx, outcome, '', [PDF_FILE]);
          },
        );

        asCase('valid', 'Staff sends text together with an attachment', 'Message sent (201) with the text and the attachment').it(
          'stores the text and the attachment',
          async () => {
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [PDF_FILE]);
            expectMessageSent(ctx, outcome, VALID_BODY, [PDF_FILE]);
          },
        );

        asCase(
          'valid',
          `Staff attaches a file of each allowed type (${ALLOWED_FILES.length} variants)`,
          'Message sent (201) with the file uploaded and listed on the message',
        ).it.each(ALLOWED_FILES.map((file) => [file.type, file] as const))('accepts %s', async (_type, file) => {
          const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
          expectMessageSent(ctx, outcome, VALID_BODY, [file]);
        });

        asCase('valid', 'Staff attaches the maximum of 5 files', 'Message sent (201) with all 5 files uploaded and listed').it(
          'accepts 5 files',
          async () => {
            const files = ALLOWED_FILES.slice(0, 5);
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, files);
            expectMessageSent(ctx, outcome, VALID_BODY, files);
          },
        );

        asCase('valid', 'Staff attaches a file of exactly 10 MB', 'Message sent (201) with the file uploaded').it(
          'accepts a file at the size limit',
          async () => {
            const file = chatFile('scan.pdf', 'application/pdf', CHAT_ATTACHMENT_MAX_BYTES);
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
            expectMessageSent(ctx, outcome, VALID_BODY, [file]);
          },
        );

        asCase('valid', 'Staff attaches a file whose name has spaces and accents', 'Message sent (201); the original file name is kept on the message').it(
          'keeps the original file name',
          async () => {
            const file = chatFile('Ulat sa Pulong — Año 2026.pdf', 'application/pdf');
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
            expectMessageSent(ctx, outcome, VALID_BODY, [file]);
            expect(outcome.body.data.attachments[0].name).toBe(file.name);
          },
        );
      });
    });
  });
}

/* ── Mark Read ───────────────────────────────────────────────────────────── */
{
  const contactIdFixtures: LayerFixture<string>[] = [
    { name: 'Staff opens a conversation by the contact user id', input: VALID_CONTACT_ID, expected: 'PASS' },
    { name: 'Staff opens a conversation whose contact id is in upper case', input: VALID_CONTACT_ID.toUpperCase(), expected: 'PASS' },
  ];

  describe('chat site — Mark Read field validation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      describe('contactId', () => describeContactIdTable(ctx, 'read', contactIdFixtures));

      describe('contactId', () => {
        asCase(
          'valid',
          'Staff marks an existing conversation as read',
          'Conversation marked as read (201) with unread 0; the read marker is written for the caller',
        ).it('marks the conversation read', async () => {
          const outcome = await markRead(ctx);
          expectMarkedRead(ctx, outcome);
        });

        asCase(
          'valid',
          `Staff marks as read a conversation with every portal role (${PORTAL_ROLES.length} variants)`,
          'Conversation marked as read (201) with unread 0',
        ).it.each(PORTAL_ROLES)('accepts a %s contact', async (role) => {
          ctx.repository.findContact.mockResolvedValue(storedContact(role) as never);
          const outcome = await markRead(ctx);
          expectMarkedRead(ctx, outcome);
        });
      });
    });
  });
}
