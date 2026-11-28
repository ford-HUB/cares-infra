import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Agent } from 'node:http';
import request from 'supertest';
import { ChatGateway } from '../../../../src/gateways/chat-gateway';
import { S3Service } from '../../../../src/infastructures/s3/s3-service';
import { RoleType } from '../../../../src/infastructures/prisma/common/client';
import { ChatSiteController } from '../../../../src/modules/chat/controllers/chat-site-controller';
import {
  ChatRepository,
  type NewAttachment,
} from '../../../../src/modules/chat/repositories/chat-repository';
import { ChatSiteService } from '../../../../src/modules/chat/services/chat-site-service';
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_MESSAGE_MAX_LENGTH,
  SendChatMessageSchema,
} from '../../../../src/modules/chat/validators/chat-site-validator';
import {
  LayerFixture,
  LayerOutcome,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectSafeErrorEnvelope,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Chat Module', unit: 'Send Message / Mark Read', prefix: 'CHAT' });

/**
 * Real controller + service, so service rules are production code; only ChatRepository,
 * S3Service and ChatGateway are mocked. The contactId schema is private to the
 * controller, so contactId cases are API-layer only.
 */
export const CALLER = {
  sub: '0f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
  email: 'admin@cares.ph',
  role_type: RoleType.ADMIN,
};
export const VALID_CONTACT_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const CONVERSATION_ID = '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b';
const MESSAGE_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a';
const CREATED_AT = new Date('2026-10-30T08:00:00.000Z');

export const sendPath = (contactId: string) =>
  `/api/v1/chat/conversations/${encodeURIComponent(contactId)}/messages`;
export const readPath = (contactId: string) =>
  `/api/v1/chat/conversations/${encodeURIComponent(contactId)}/read`;

export const VALID_BODY = 'Hello, are we still on for the outreach briefing?';

export const PORTAL_ROLES = [RoleType.ADMIN, RoleType.DIRECTOR, RoleType.COORDINATOR];
export const NON_PORTAL_ROLES = [RoleType.VOLUNTEER, RoleType.DONOR, RoleType.BENEFICIARY];

/** Exact refusals the real service sends. */
export const MESSAGES = {
  contactId: 'A valid contact id is required',
  controlCharacters: 'Message cannot contain control characters',
  textOrAttachment: 'A message needs text or an attachment',
  yourself: 'You cannot message yourself',
  contactNotFound: 'Contact not found',
  notPortalContact: 'That user cannot be messaged from the portal',
  noConversation: 'No conversation with that contact yet',
  tooManyFiles: 'You can attach up to 5 files per message',
  tooLarge: (name: string) => `${name} is larger than 10 MB`,
  empty: (name: string) => `${name} is empty`,
  notAllowedType: (name: string) => `${name} is not an allowed file type`,
};

export { CHAT_ATTACHMENT_MAX_BYTES, CHAT_MESSAGE_MAX_LENGTH };

/** `ChatRepository.findContact` row. */
export const storedContact = (role: RoleType = RoleType.COORDINATOR, userId = VALID_CONTACT_ID) => ({
  user_id: userId,
  firstname: 'Grace',
  lastname: 'Hopper',
  portal_department: 'College of Nursing',
  role: { type: role },
  accounts: [{ email: 'grace@cares.ph' }],
});

export interface ChatFile {
  name: string;
  type: string;
  bytes: Buffer;
}

export const chatFile = (name: string, type: string, size = 2048): ChatFile => ({
  name,
  type,
  bytes: Buffer.alloc(size, 1),
});

export const PDF_FILE = chatFile('minutes.pdf', 'application/pdf');

/** Every type the composer offers (mirrors `CHAT_ALLOWED_ATTACHMENT_MIMES`). */
export const ALLOWED_FILES: ChatFile[] = [
  chatFile('photo.jpg', 'image/jpeg'),
  chatFile('photo.png', 'image/png'),
  chatFile('photo.webp', 'image/webp'),
  chatFile('animation.gif', 'image/gif'),
  chatFile('minutes.pdf', 'application/pdf'),
  chatFile('letter.doc', 'application/msword'),
  chatFile('letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  chatFile('budget.xls', 'application/vnd.ms-excel'),
  chatFile('budget.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
  chatFile('roster.csv', 'text/csv'),
  chatFile('notes.txt', 'text/plain'),
];

/** Ordinary files the composer does not offer. */
export const DISALLOWED_FILES: ChatFile[] = [
  chatFile('setup.exe', 'application/x-msdownload'),
  chatFile('archive.zip', 'application/zip'),
  chatFile('clip.mp4', 'video/mp4'),
  chatFile('voice.mp3', 'audio/mpeg'),
  chatFile('slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
  chatFile('logo.svg', 'image/svg+xml'),
  chatFile('page.html', 'text/html'),
];

/**
 * Stub guard sets `CALLER`. Mocks reset to the happy path before each test: coordinator
 * contact, a conversation exists, uploads and writes succeed.
 */
export const useChatApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    repository: autoMock<ChatRepository>(),
    s3: autoMock<S3Service>(),
    gateway: autoMock<ChatGateway>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [ChatSiteController],
      providers: [
        ChatSiteService,
        { provide: ChatRepository, useValue: ctx.repository },
        { provide: S3Service, useValue: ctx.s3 },
        { provide: ChatGateway, useValue: ctx.gateway },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: ExecutionContext) => {
              context.switchToHttp().getRequest().user = CALLER;
              return true;
            },
          },
        },
      ],
    });
  });
  afterAll(() => ctx.app.close());

  beforeEach(() => {
    ctx.repository.findContact.mockReset().mockResolvedValue(storedContact() as never);
    ctx.repository.findConversationBetween.mockReset().mockResolvedValue(CONVERSATION_ID as never);
    ctx.repository.findOrCreateConversation.mockReset().mockResolvedValue(CONVERSATION_ID as never);
    ctx.repository.markRead.mockReset().mockResolvedValue(undefined as never);
    ctx.repository.createMessage.mockReset().mockImplementation((async (
      conversationId: string,
      senderId: string,
      body: string,
      attachments: NewAttachment[],
    ) => ({
      message_id: MESSAGE_ID,
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      createdAt: CREATED_AT,
      sender: { role: { type: CALLER.role_type } },
      attachments: attachments.map((attachment, index) => ({
        attachment_id: `attachment-${index + 1}`,
        name: attachment.name,
        size: attachment.size,
        mime_type: attachment.mimeType,
      })),
    })) as never);
    ctx.s3.uploadToS3.mockReset().mockImplementation((async (key: string) =>
      `https://bucket.s3.amazonaws.com/${key}`) as never);
    ctx.gateway.emitMessage.mockReset();
    ctx.gateway.emitRead.mockReset();
  });

  return ctx;
};

export type ChatCtx = ReturnType<typeof useChatApp>;

const keepAliveAgent = new Agent({ keepAlive: true });

const toOutcome = (res: request.Response): LayerOutcome => ({
  layer: 'api',
  verdict: res.status < 400 ? 'PASS' : 'FAIL',
  issues: Array.isArray(res.body?.errors) ? res.body.errors : [],
  status: res.status,
  body: res.body,
});

/** Multipart, as the portal composer sends it; empty `fields` sends no text field. */
export const sendMessage = async (
  ctx: ChatCtx,
  fields: Record<string, string> = {},
  files: ChatFile[] = [],
  contactId = VALID_CONTACT_ID,
  fileField = 'files',
): Promise<LayerOutcome> => {
  let req = request(ctx.app.getHttpServer()).post(sendPath(contactId)).agent(keepAliveAgent);
  for (const [name, value] of Object.entries(fields)) req = req.field(name, value);
  for (const file of files) {
    req = req.attach(fileField, file.bytes, { filename: file.name, contentType: file.type });
  }
  return toOutcome(await req);
};

export const markRead = (ctx: ChatCtx, contactId = VALID_CONTACT_ID) =>
  runApiLayer(ctx.app, { method: 'post', path: readPath(contactId) });

export const expectRefusal = (outcome: LayerOutcome, status: number, message: string) => {
  expect(outcome.status).toBe(status);
  expectSafeErrorEnvelope(outcome);
  expect(outcome.body.message).toBe(message);
};

export const expectNothingSent = (ctx: ChatCtx) => {
  expect(ctx.s3.uploadToS3).not.toHaveBeenCalled();
  expect(ctx.repository.createMessage).not.toHaveBeenCalled();
  expect(ctx.gateway.emitMessage).not.toHaveBeenCalled();
};

export const expectNothingMarked = (ctx: ChatCtx) => {
  expect(ctx.repository.markRead).not.toHaveBeenCalled();
  expect(ctx.gateway.emitRead).not.toHaveBeenCalled();
};

export const expectMessageSent = (ctx: ChatCtx, outcome: LayerOutcome, body: string, files: ChatFile[] = []) => {
  expect(outcome.status).toBe(201);
  expect(outcome.body.ok).toBe(true);
  expect(ctx.repository.createMessage).toHaveBeenCalledTimes(1);
  const [conversationId, senderId, storedBody, attachments] = ctx.repository.createMessage.mock.calls[0];
  expect(conversationId).toBe(CONVERSATION_ID);
  expect(senderId).toBe(CALLER.sub);
  expect(storedBody).toBe(body);
  expect(attachments).toEqual(
    files.map((file) => expect.objectContaining({ name: file.name, size: file.bytes.length, mimeType: file.type })),
  );
  expect(ctx.s3.uploadToS3).toHaveBeenCalledTimes(files.length);
  expect(ctx.gateway.emitMessage).toHaveBeenCalledTimes(2);
  expect(outcome.body.data).toEqual(
    expect.objectContaining({ conversation_id: CONVERSATION_ID, sender_id: CALLER.sub, body }),
  );
  expect(outcome.body.data.attachments).toHaveLength(files.length);
};

export const expectMarkedRead = (ctx: ChatCtx, outcome: LayerOutcome, contactId = VALID_CONTACT_ID) => {
  expect(outcome.status).toBe(201);
  expect(outcome.body).toEqual({
    ok: true,
    message: 'Conversation marked as read',
    data: { conversation_id: CONVERSATION_ID, contact_id: contactId, unread: 0 },
  });
  expect(ctx.repository.markRead).toHaveBeenCalledWith(CONVERSATION_ID, CALLER.sub);
  expect(ctx.gateway.emitRead).toHaveBeenCalledTimes(1);
};

/** `input` is the multipart text fields; one PDF rides along so "text or an attachment" never fails a case. */
export const describeBodyTable = (ctx: ChatCtx, fixtures: LayerFixture<Record<string, string>>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(SendChatMessageSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await sendMessage(ctx, fixture.input, [PDF_FILE]);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.repository.findContact).not.toHaveBeenCalled();
        expectNothingSent(ctx);
      } else {
        expect(ctx.repository.createMessage).toHaveBeenCalledTimes(1);
      }
    });
  });
};

export type ChatRoute = 'send' | 'read';

/** `input` is the raw id (URL-encoded); valid text is sent so only the id is tested. */
export const describeContactIdTable = (ctx: ChatCtx, route: ChatRoute, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome =
        route === 'send'
          ? await sendMessage(ctx, { body: VALID_BODY }, [], fixture.input)
          : await markRead(ctx, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(outcome.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ message: MESSAGES.contactId })]),
        );
        expect(ctx.repository.findContact).not.toHaveBeenCalled();
        if (route === 'send') expectNothingSent(ctx);
        else expectNothingMarked(ctx);
      } else if (route === 'send') {
        expect(ctx.repository.createMessage).toHaveBeenCalledTimes(1);
      } else {
        expect(ctx.repository.markRead).toHaveBeenCalledTimes(1);
      }
    });
  });
};
