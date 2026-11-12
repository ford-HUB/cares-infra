import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MailboxSiteController } from '../../../../src/modules/mailbox/controllers/mailbox-site-controller';
import { MailboxSiteService } from '../../../../src/modules/mailbox/services/mailbox-site-service';
import { SendMailSchema } from '../../../../src/modules/mailbox/validators/mailbox-site-validator';
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

setCaseUnit({ module: 'Mail Inbox Module', unit: 'Connect / Send Mail', prefix: 'MAIL' });

/**
 * Shared by every spec in this folder — the Mail Inbox module's two POSTs:
 *   POST /api/v1/mailbox/connection  (createAuthorizeUrl: no body, caller from the token)
 *   POST /api/v1/mailbox/messages    (sendMail: SendMailSchema)
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const CONNECTION_PATH = '/api/v1/mailbox/connection';
export const MESSAGES_PATH = '/api/v1/mailbox/messages';

export const CALLER = { sub: 'caller-user-id' };

export const VALID_MAIL = {
  to: ['beneficiary@cares.ph'],
  subject: 'Outreach briefing',
  body: 'See you at the briefing on Friday.',
};

/** A real Gmail thread id and the shape of a real Gmail `Message-ID` header. */
export const VALID_THREAD_ID = '18c2f1a9b3d4e5f6';
export const VALID_IN_REPLY_TO = '<CAF+abc_123=def.456@mail.gmail.com>';

export const AUTHORIZE_RESPONSE = { authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth?state=nonce' };
export const SEND_RESPONSE = { id: '18c2f1a9b3d4e5f7', thread_id: VALID_THREAD_ID };

/**
 * Boots `MailboxSiteController` with a mocked service for the enclosing
 * `describe`. The controller reads `user.sub`, so a stand-in for the global JWT
 * guard puts `CALLER` on the request. Read `app` inside tests — it is assigned
 * in `beforeAll`.
 */
export const useMailboxApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<MailboxSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [MailboxSiteController],
      providers: [
        { provide: MailboxSiteService, useValue: ctx.service },
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
    ctx.service.createAuthorizeUrl.mockReset().mockResolvedValue(AUTHORIZE_RESPONSE as never);
    ctx.service.sendMail.mockReset().mockResolvedValue(SEND_RESPONSE as never);
  });

  return ctx;
};

/**
 * sendMail fixtures through both layers. A FAIL must come back in the validation
 * envelope without reaching the service; a PASS must reach it exactly once.
 */
export const describeSendMailTable = (ctx: ReturnType<typeof useMailboxApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(SendMailSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: MESSAGES_PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.sendMail).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.sendMail).toHaveBeenCalledTimes(1);
      }
    });
  });
};
