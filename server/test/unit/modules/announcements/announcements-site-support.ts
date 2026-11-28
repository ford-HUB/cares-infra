import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
  AnnouncementTone,
} from '../../../../src/infastructures/prisma/common/client';
import { AnnouncementsSiteController } from '../../../../src/modules/announcements/controllers/announcements-site-controller';
import { AnnouncementsSiteService } from '../../../../src/modules/announcements/services/announcements-site-service';
import { SaveAnnouncementSchema } from '../../../../src/modules/announcements/validators/announcements-site-validator';
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

setCaseUnit({ module: 'Notices Module', unit: 'Create Announcement', prefix: 'NOTICE' });

export const ANNOUNCEMENTS_PATH = '/api/v1/announcements';
export const CALLER = { sub: 'caller-user-id' };

export const VALID_ANNOUNCEMENT = {
  title: 'Certificate dispatcher upgrade',
  body: 'Certificates pause briefly this Saturday while the dispatcher is upgraded.',
  tone: AnnouncementTone.INFO,
  audiences: [AnnouncementAudience.VOLUNTEERS],
  channels: [AnnouncementChannel.PORTAL],
  state: AnnouncementState.DRAFT,
  publish_at: '2099-01-01T08:00:00.000Z',
  expires_at: null,
  pinned: false,
  window_id: null,
};

export const ANNOUNCEMENT_RESPONSE = {
  ...VALID_ANNOUNCEMENT,
  announcement_id: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  author_id: CALLER.sub,
  author_name: 'Ada Lovelace',
  reach: 0,
  created_at: '2026-11-01T08:00:00.000Z',
  updated_at: '2026-11-01T08:00:00.000Z',
};

/** Stub guard sets `CALLER` (handler reads `user.sub`); `app` is assigned in `beforeAll`. */
export const useAnnouncementsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<AnnouncementsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [AnnouncementsSiteController],
      providers: [
        { provide: AnnouncementsSiteService, useValue: ctx.service },
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
    ctx.service.createAnnouncement.mockReset().mockResolvedValue(ANNOUNCEMENT_RESPONSE as never);
  });

  return ctx;
};

/** FAIL: validation envelope, service untouched. PASS: service called once. */
export const describeAnnouncementTable = (ctx: ReturnType<typeof useAnnouncementsApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(SaveAnnouncementSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: ANNOUNCEMENTS_PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.createAnnouncement).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.createAnnouncement).toHaveBeenCalledTimes(1);
      }
    });
  });
};
