import { LayerFixture } from '../../../../config/layer-harness';
import { asCase } from '../../../../config/test-case';
import {
  ALLOWED_FILES,
  CALLER,
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_MESSAGE_MAX_LENGTH,
  DISALLOWED_FILES,
  MESSAGES,
  NON_PORTAL_ROLES,
  PDF_FILE,
  VALID_BODY,
  VALID_CONTACT_ID,
  chatFile,
  describeBodyTable,
  describeContactIdTable,
  expectNothingMarked,
  expectNothingSent,
  expectRefusal,
  markRead,
  sendMessage,
  storedContact,
  useChatApp,
} from '../chat-site-support';

const contactIdFixtures = (subject: string): LayerFixture<string>[] => [
  { name: `Staff ${subject} a contact id that is not a uuid`, input: 'contact-1', expected: 'FAIL' },
  { name: `Staff ${subject} a contact id that is a plain number`, input: '42', expected: 'FAIL' },
  { name: `Staff ${subject} a contact id missing its last character`, input: VALID_CONTACT_ID.slice(0, -1), expected: 'FAIL' },
  { name: `Staff ${subject} a contact id with an extra character`, input: `${VALID_CONTACT_ID}0`, expected: 'FAIL' },
  { name: `Staff ${subject} a contact id without hyphens`, input: VALID_CONTACT_ID.replace(/-/g, ''), expected: 'FAIL' },
  { name: `Staff ${subject} a contact id with surrounding spaces`, input: ` ${VALID_CONTACT_ID} `, expected: 'FAIL' },
  { name: `Staff ${subject} a contact id with a non-hex character`, input: `${VALID_CONTACT_ID.slice(0, -1)}g`, expected: 'FAIL' },
  { name: `Staff ${subject} a blank contact id`, input: ' ', expected: 'FAIL' },
];

{
  // Every fixture is sent with one PDF attached, so only the body's own rules can fail it.
  const bodyFixtures: LayerFixture<Record<string, string>>[] = [
    {
      name: `Staff types a message of ${CHAT_MESSAGE_MAX_LENGTH + 1} characters`,
      input: { body: 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1) },
      expected: 'FAIL',
      field: 'body',
    },
    {
      name: 'Staff pastes text containing a non-printing character (bell)',
      input: { body: 'Meeting at 3\u0007' },
      expected: 'FAIL',
      field: 'body',
      message: MESSAGES.controlCharacters,
    },
    {
      name: 'Staff pastes text containing a form-feed character',
      input: { body: 'Page one\u000Cpage two' },
      expected: 'FAIL',
      field: 'body',
      message: MESSAGES.controlCharacters,
    },
    {
      name: 'Staff pastes text containing a delete character',
      input: { body: 'Typo\u007F' },
      expected: 'FAIL',
      field: 'body',
      message: MESSAGES.controlCharacters,
    },
  ];

  describe('chat site — Send Message field validation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/messages', () => {
      describe('contactId', () => describeContactIdTable(ctx, 'send', contactIdFixtures('messages')));

      describe('contactId', () => {
        asCase('invalid', 'Staff tries to message themselves', `Message fails with "${MESSAGES.yourself}" (400); nothing is stored`).it(
          'refuses a message to the caller',
          async () => {
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [], CALLER.sub);
            expectRefusal(outcome, 400, MESSAGES.yourself);
            expect(ctx.repository.findContact).not.toHaveBeenCalled();
            expect(ctx.repository.findOrCreateConversation).not.toHaveBeenCalled();
            expectNothingSent(ctx);
          },
        );

        asCase('invalid', 'Staff messages a well-formed id that belongs to no user', `Message fails with "${MESSAGES.contactNotFound}" (404); nothing is stored`).it(
          'refuses an unknown contact',
          async () => {
            ctx.repository.findContact.mockResolvedValue(null as never);
            const outcome = await sendMessage(ctx, { body: VALID_BODY });
            expectRefusal(outcome, 404, MESSAGES.contactNotFound);
            expect(ctx.repository.findOrCreateConversation).not.toHaveBeenCalled();
            expectNothingSent(ctx);
          },
        );

        asCase(
          'invalid',
          `Staff messages a user who is not portal staff (${NON_PORTAL_ROLES.length} variants)`,
          `Message fails with "${MESSAGES.notPortalContact}" (403); nothing is stored`,
        ).it.each(NON_PORTAL_ROLES)('refuses a %s contact', async (role) => {
          ctx.repository.findContact.mockResolvedValue(storedContact(role) as never);
          const outcome = await sendMessage(ctx, { body: VALID_BODY });
          expectRefusal(outcome, 403, MESSAGES.notPortalContact);
          expect(ctx.repository.findOrCreateConversation).not.toHaveBeenCalled();
          expectNothingSent(ctx);
        });
      });

      describe('body', () => {
        asCase('invalid', 'Client posts the message with no form data at all (no text field, no files)', 'Message fails with 400 in the { ok: false } envelope; nothing is stored').it(
          'refuses a request with no form data',
          async () => {
            const outcome = await sendMessage(ctx);
            expect(outcome.status).toBe(400);
            expect(outcome.body.ok).toBe(false);
            expect(ctx.repository.findOrCreateConversation).not.toHaveBeenCalled();
            expectNothingSent(ctx);
          },
        );

        asCase('invalid', 'Staff sends an empty text box with no attachment', `Message fails with "${MESSAGES.textOrAttachment}" (400); nothing is stored`).it(
          'refuses an empty body with no files',
          async () => {
            const outcome = await sendMessage(ctx, { body: '' });
            expectRefusal(outcome, 400, MESSAGES.textOrAttachment);
            expect(ctx.repository.findOrCreateConversation).not.toHaveBeenCalled();
            expectNothingSent(ctx);
          },
        );

        asCase('invalid', 'Staff sends only spaces and line breaks with no attachment', `Message fails with "${MESSAGES.textOrAttachment}" (400); nothing is stored`).it(
          'refuses a whitespace-only body with no files',
          async () => {
            const outcome = await sendMessage(ctx, { body: '   \r\n\t  ' });
            expectRefusal(outcome, 400, MESSAGES.textOrAttachment);
            expect(ctx.repository.findOrCreateConversation).not.toHaveBeenCalled();
            expectNothingSent(ctx);
          },
        );
      });

      describe('body', () => describeBodyTable(ctx, bodyFixtures));

      describe('body', () => {
        asCase('invalid', 'Client sends a form field the message does not take (subject)', 'Message fails with "Validation failed" (400) reporting unrecognized_keys; nothing is stored').it(
          'refuses an unknown form field',
          async () => {
            const outcome = await sendMessage(ctx, { body: VALID_BODY, subject: 'Briefing' });
            expect(outcome.status).toBe(400);
            expect(outcome.body.message).toBe('Validation failed');
            expect(JSON.stringify(outcome.body.errors)).toContain('subject');
            expect(ctx.repository.findContact).not.toHaveBeenCalled();
            expectNothingSent(ctx);
          },
        );
      });

      // describe('files', () => {
      //   asCase('invalid', 'Staff attaches 6 files, one more than the limit', `Message fails with "${MESSAGES.tooManyFiles}" (400); nothing is uploaded or stored`).it(
      //     'refuses more than 5 files',
      //     async () => {
      //       const outcome = await sendMessage(ctx, { body: VALID_BODY }, ALLOWED_FILES.slice(0, 6));
      //       expectRefusal(outcome, 400, MESSAGES.tooManyFiles);
      //       expectNothingSent(ctx);
      //     },
      //   );

        asCase('invalid', 'Staff attaches a file 1 byte over 10 MB', 'Message fails with "scan.pdf is larger than 10 MB" (400); nothing is uploaded or stored').it(
          'refuses a file over the size limit',
          async () => {
            const file = chatFile('scan.pdf', 'application/pdf', CHAT_ATTACHMENT_MAX_BYTES + 1);
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
            expectRefusal(outcome, 400, MESSAGES.tooLarge(file.name));
            expectNothingSent(ctx);
          },
        );

        asCase('invalid', 'Staff attaches an empty (0-byte) file', 'Message fails with "blank.pdf is empty" (400); nothing is uploaded or stored').it(
          'refuses an empty file',
          async () => {
            const file = chatFile('blank.pdf', 'application/pdf', 0);
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
            expectRefusal(outcome, 400, MESSAGES.empty(file.name));
            expectNothingSent(ctx);
          },
        );

        asCase(
          'invalid',
          `Staff attaches a file of a type the chat does not allow (${DISALLOWED_FILES.length} variants)`,
          'Message fails with "{file} is not an allowed file type" (400); nothing is uploaded or stored',
        ).it.each(DISALLOWED_FILES.map((file) => [file.type, file] as const))('refuses %s', async (_type, file) => {
          const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
          expectRefusal(outcome, 400, MESSAGES.notAllowedType(file.name));
          expectNothingSent(ctx);
        });

        asCase('invalid', 'Staff renames a program to look like a PDF (setup.pdf sent as an executable)', 'Message fails with "setup.pdf is not an allowed file type" (400); nothing is uploaded or stored').it(
          'refuses by the file type, not the extension',
          async () => {
            const file = chatFile('setup.pdf', 'application/x-msdownload');
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [file]);
            expectRefusal(outcome, 400, MESSAGES.notAllowedType(file.name));
            expectNothingSent(ctx);
          },
        );


        asCase('invalid', 'Client attaches files under a form field other than "files"', 'Message fails with 400; nothing is uploaded or stored').it(
          'refuses files sent under the wrong field',
          async () => {
            const outcome = await sendMessage(ctx, { body: VALID_BODY }, [PDF_FILE], VALID_CONTACT_ID, 'attachments');
            expect(outcome.status).toBe(400);
            expect(outcome.body.ok).toBe(false);
            expectNothingSent(ctx);
          },
        );
      });
    });
  });
}

{
  describe('chat site — Mark Read field validation', () => {
    const ctx = useChatApp();

    describe('POST /api/v1/chat/conversations/:contactId/read', () => {
      describe('contactId', () => describeContactIdTable(ctx, 'read', contactIdFixtures('marks as read')));

      describe('contactId', () => {
        asCase('invalid', 'Staff marks their own id as a read conversation', `Mark Read fails with "${MESSAGES.yourself}" (400); nothing is marked`).it(
          'refuses the caller as the contact',
          async () => {
            const outcome = await markRead(ctx, CALLER.sub);
            expectRefusal(outcome, 400, MESSAGES.yourself);
            expect(ctx.repository.findContact).not.toHaveBeenCalled();
            expectNothingMarked(ctx);
          },
        );

        asCase('invalid', 'Staff marks as read a well-formed id that belongs to no user', `Mark Read fails with "${MESSAGES.contactNotFound}" (404); nothing is marked`).it(
          'refuses an unknown contact',
          async () => {
            ctx.repository.findContact.mockResolvedValue(null as never);
            const outcome = await markRead(ctx);
            expectRefusal(outcome, 404, MESSAGES.contactNotFound);
            expect(ctx.repository.findConversationBetween).not.toHaveBeenCalled();
            expectNothingMarked(ctx);
          },
        );

        asCase(
          'invalid',
          `Staff marks as read a user who is not portal staff (${NON_PORTAL_ROLES.length} variants)`,
          `Mark Read fails with "${MESSAGES.notPortalContact}" (403); nothing is marked`,
        ).it.each(NON_PORTAL_ROLES)('refuses a %s contact', async (role) => {
          ctx.repository.findContact.mockResolvedValue(storedContact(role) as never);
          const outcome = await markRead(ctx);
          expectRefusal(outcome, 403, MESSAGES.notPortalContact);
          expect(ctx.repository.findConversationBetween).not.toHaveBeenCalled();
          expectNothingMarked(ctx);
        });

        asCase('invalid', 'Staff marks as read a portal contact they have never messaged', `Mark Read fails with "${MESSAGES.noConversation}" (404); nothing is marked`).it(
          'refuses when there is no conversation yet',
          async () => {
            ctx.repository.findConversationBetween.mockResolvedValue(null as never);
            const outcome = await markRead(ctx);
            expectRefusal(outcome, 404, MESSAGES.noConversation);
            expectNothingMarked(ctx);
          },
        );
      });
    });
  });
}
