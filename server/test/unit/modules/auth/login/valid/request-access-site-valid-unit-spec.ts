import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  SecurityPayload,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../../config/security-payloads';
import { defineCases } from '../../../../../config/test-case';
import {
  ACCESS_REQUEST,
  ACCESS_REQUEST_RECIPIENT,
  BODY_PREFIX,
  MODULE,
  Upload,
  VALID_ACCESS_REQUEST as VALID,
  acceptedBySchema,
  postAccessRequest,
  upload,
  useAuthSiteApp,
} from '../login-site-support';

/**
 * Request Access — valid inputs. The form is mailed to the administrators'
 * inbox with the sender as Reply-To; text is HTML-escaped in the mail, and up to
 * five PDF / image / Word attachments (5 MB each, 15 MB combined) ride along.
 */
const testCase = defineCases({ module: MODULE, unit: 'Request Access', kind: 'valid', prefix: 'ACCESS' });

const MB = 1024 * 1024;

const FREE_TEXT_FAMILIES: [string, SecurityPayload[]][] = [
  ['SQL keywords and quotes', SQL_INJECTION_PAYLOADS],
  ['runs of special characters', specialCharacterSeries()],
  ['look-alike unicode characters', UNICODE_CONFUSABLE_PAYLOADS],
  ['HTML / script markup', XSS_PAYLOADS],
  ['file-path text', PATH_TRAVERSAL_PAYLOADS],
];

describe('Request Access — valid inputs', () => {
  const ctx = useAuthSiteApp();

  const expectDelivered = async (fields: Record<string, string>, files: Upload[] = []) => {
    const outcome = await postAccessRequest(ctx, fields, files);
    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual({
      ok: true,
      message: 'Access request sent',
      data: { delivered_to: ACCESS_REQUEST_RECIPIENT, attachment_count: files.length },
    });
    expect(ctx.mailer.sendEmail).toHaveBeenCalledTimes(1);
    return ctx.mailer.sendEmail.mock.calls[0];
  };

  testCase(
    'Volunteer fills in email, subject and message',
    '"Access request sent" — mailed to the admin inbox with the volunteer as Reply-To',
    () => {
      acceptedBySchema(ACCESS_REQUEST, VALID);
      it('layer 2 — api delivers the request', async () => {
        const [to, subject, , options] = await expectDelivered(VALID);
        expect(to).toBe(ACCESS_REQUEST_RECIPIENT);
        expect(subject).toBe(VALID.subject);
        expect(options).toEqual(expect.objectContaining({ replyTo: VALID.from_email, attachments: [] }));
      });
    },
  );

  testCase(
    'Volunteer enters the fields with surrounding spaces and an upper-case email',
    'Every field is trimmed and the email lower-cased; request sent',
    () => {
      const padded = { from_email: '  Volunteer@CARES.ph ', subject: `  ${VALID.subject}  `, body: `  ${VALID.body}  ` };
      acceptedBySchema(ACCESS_REQUEST, padded);
      it('layer 2 — api delivers the normalised request', async () => {
        const [, subject, html, options] = await expectDelivered(padded);
        expect(subject).toBe(VALID.subject);
        expect(html).toContain(VALID.body);
        expect(options).toEqual(expect.objectContaining({ replyTo: 'volunteer@cares.ph' }));
      });
    },
  );

  testCase('Subject is 1 character long (minimum)', 'Request sent', () => {
    acceptedBySchema(ACCESS_REQUEST, { ...VALID, subject: 'a' });
    it('layer 2 — api delivers the request', async () => {
      await expectDelivered({ ...VALID, subject: 'a' });
    });
  });
  testCase('Subject is 200 characters long (maximum)', 'Request sent', () => {
    acceptedBySchema(ACCESS_REQUEST, { ...VALID, subject: 'a'.repeat(200) });
    it('layer 2 — api delivers the request', async () => {
      await expectDelivered({ ...VALID, subject: 'a'.repeat(200) });
    });
  });
  testCase('Subject contains an apostrophe and a hyphen ("O\'Neil - CCS access")', 'Request sent', () => {
    acceptedBySchema(ACCESS_REQUEST, { ...VALID, subject: "O'Neil - CCS access" });
    it('layer 2 — api delivers the request', async () => {
      await expectDelivered({ ...VALID, subject: "O'Neil - CCS access" });
    });
  });
  testCase('Message is 20 characters long (minimum)', 'Request sent', () => {
    acceptedBySchema(ACCESS_REQUEST, { ...VALID, body: 'a'.repeat(20) });
    it('layer 2 — api delivers the request', async () => {
      await expectDelivered({ ...VALID, body: 'a'.repeat(20) });
    });
  });
  testCase('Message is 10,000 characters long (maximum)', 'Request sent', () => {
    acceptedBySchema(ACCESS_REQUEST, { ...VALID, body: 'a'.repeat(10000) });
    it('layer 2 — api delivers the request', async () => {
      await expectDelivered({ ...VALID, body: 'a'.repeat(10000) });
    });
  });
  testCase('Message has several lines (the portal sends CRLF line breaks)', 'Request sent with the line breaks kept', () => {
    const body = `${BODY_PREFIX}\r\nLine two\r\nLine three`;
    acceptedBySchema(ACCESS_REQUEST, { ...VALID, body });
    it('layer 2 — api delivers the request', async () => {
      const [, , html] = await expectDelivered({ ...VALID, body });
      expect(html).toContain('Line three');
    });
  });

  for (const [family, payloads] of FREE_TEXT_FAMILIES) {
    testCase(
      `Message contains ${family} as ordinary text (${payloads.length} variants)`,
      'Request sent — the message is free text; markup is HTML-escaped in the email',
      () => {
        it.each(payloads.map((p) => ({ label: p.label, value: p.value as string })))('$label', async ({ value }) => {
          const body = `${BODY_PREFIX} ${value}`;
          ctx.mailer.sendEmail.mockClear();
          const [, , html] = await expectDelivered({ ...VALID, body });
          expect(html).not.toMatch(/<script|<img|<svg|<iframe/i);
        });
      },
    );
  }
  testCase(
    'Message contains CRLF line breaks among control characters',
    'Request sent — CRLF is the only control sequence the message accepts',
    () => {
      const crlf = CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection');
      it.each(crlf.map((p) => ({ label: p.label, value: p.value as string })))('$label', async ({ value }) => {
        await expectDelivered({ ...VALID, body: `${BODY_PREFIX} ${value}` });
      });
    },
  );

  testCase('Volunteer attaches one PDF', 'Request sent with 1 attachment', () => {
    it('layer 2 — api forwards the file', async () => {
      const [, , html, options] = await expectDelivered(VALID, [upload('id.pdf', 'application/pdf', 2048)]);
      expect(options.attachments).toEqual([expect.objectContaining({ filename: 'id.pdf', contentType: 'application/pdf' })]);
      expect(html).toContain('<li>id.pdf</li>');
    });
  });
  testCase(
    'Volunteer attaches 5 files — PDF, JPEG, PNG, WEBP and DOCX (maximum count)',
    'Request sent with 5 attachments',
    () => {
      it('layer 2 — api forwards all five', async () => {
        await expectDelivered(VALID, [
          upload('id.pdf', 'application/pdf', 1024),
          upload('photo.jpg', 'image/jpeg', 1024),
          upload('scan.png', 'image/png', 1024),
          upload('scan.webp', 'image/webp', 1024),
          upload('letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024),
        ]);
      });
    },
  );
  testCase('Volunteer attaches a legacy Word .doc file', 'Request sent with 1 attachment', () => {
    it('layer 2 — api forwards the file', async () => {
      await expectDelivered(VALID, [upload('letter.doc', 'application/msword', 1024)]);
    });
  });
  testCase('Volunteer attaches a file of exactly 5 MB (per-file limit)', 'Request sent with 1 attachment', () => {
    it('layer 2 — api forwards the file', async () => {
      await expectDelivered(VALID, [upload('scan.pdf', 'application/pdf', 5 * MB)]);
    });
  });
  testCase('Volunteer attaches three 5 MB files — 15 MB combined (total limit)', 'Request sent with 3 attachments', () => {
    it('layer 2 — api forwards the files', async () => {
      await expectDelivered(VALID, [
        upload('a.pdf', 'application/pdf', 5 * MB),
        upload('b.pdf', 'application/pdf', 5 * MB),
        upload('c.pdf', 'application/pdf', 5 * MB),
      ]);
    });
  });
});
