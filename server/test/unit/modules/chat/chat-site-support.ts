import { INestApplication } from '@nestjs/common';
import { RoleType } from '../../../../src/infastructures/prisma/common/client';
import { ChatSiteController } from '../../../../src/modules/chat/controllers/chat-site-controller';
import { ChatSiteService } from '../../../../src/modules/chat/services/chat-site-service';
import { SendChatMessageSchema } from '../../../../src/modules/chat/validators/chat-site-validator';
import {
  LayerFixture,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Chat Module', unit: 'Send Message / Mark Read', prefix: 'CHAT' });

/**
 * Shared by every spec in this folder — the portal Chat module's two POSTs:
 *   POST /api/v1/chat/conversations/:contactId/messages  (sendMessage: contactId uuid + SendChatMessageSchema)
 *   POST /api/v1/chat/conversations/:contactId/read      (markRead: contactId uuid, no body)
 *
 * The contactId schema is a private const in the controller, so path-param
 * fixtures run through the API layer only.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_CONTACT_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const CONVERSATION_ID = '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b';
const MESSAGE_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a';

export const sendPath = (contactId: string) =>
  `/api/v1/chat/conversations/${encodeURIComponent(contactId)}/messages`;
export const readPath = (contactId: string) =>
  `/api/v1/chat/conversations/${encodeURIComponent(contactId)}/read`;

export const SEND_ENDPOINT = { name: 'sendMessage', path: sendPath, method: 'sendMessage' } as const;
export const READ_ENDPOINT = { name: 'markRead', path: readPath, method: 'markRead' } as const;
type ChatEndpoint = typeof SEND_ENDPOINT | typeof READ_ENDPOINT;

export const VALID_MESSAGE = { body: 'Hello, are we still on for the outreach briefing?' };

export const MESSAGE_RESPONSE = {
  message_id: MESSAGE_ID,
  conversation_id: CONVERSATION_ID,
  sender_id: VALID_CONTACT_ID,
  sender_role_type: Object.values(RoleType)[0],
  body: VALID_MESSAGE.body,
  created_at: '2026-10-30T08:00:00.000Z',
  attachments: [],
};
export const READ_RECEIPT = { conversation_id: CONVERSATION_ID, contact_id: VALID_CONTACT_ID, unread: 0 };

/**
 * Boots `ChatSiteController` with a mocked service for the enclosing `describe`
 * and resets both endpoint methods before each test. Read `app` inside tests —
 * it is assigned in `beforeAll`.
 */
export const useChatApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<ChatSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [ChatSiteController],
      providers: [{ provide: ChatSiteService, useValue: ctx.service }],
    });
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    ctx.service.sendMessage.mockReset().mockResolvedValue(MESSAGE_RESPONSE as never);
    ctx.service.markRead.mockReset().mockResolvedValue(READ_RECEIPT as never);
  });

  return ctx;
};

/**
 * sendMessage body fixtures through both layers, against a valid contactId.
 * A FAIL must come back in the validation envelope without reaching the
 * service; a PASS must reach it exactly once.
 */
export const describeMessageBodyTable = (ctx: ReturnType<typeof useChatApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(SendChatMessageSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: sendPath(VALID_CONTACT_ID),
        body: fixture.input,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.sendMessage).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.sendMessage).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/**
 * contactId fixtures (the fixture `input` is the raw id, URL-encoded into the
 * path) through the API layer. sendMessage gets a valid body so the param is
 * the only thing under test.
 */
export const describeContactIdTable = (
  ctx: ReturnType<typeof useChatApp>,
  endpoint: ChatEndpoint,
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(fixture.input),
        body: endpoint === SEND_ENDPOINT ? VALID_MESSAGE : undefined,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
      } else {
        expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
      }
    });
  });
};
