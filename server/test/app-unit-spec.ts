import { Controller, INestApplication, Injectable, Post } from '@nestjs/common';
import { ZBody } from 'nest-zod';
import { z } from 'zod';
import { RoleType } from '../src/infastructures/prisma/common/client';
import { ResponseMessage } from '../src/shared/decorators/response-message-decorator';
import {
  LayerFixture,
  createApiLayerApp,
  expectLayer,
  expectSafeErrorEnvelope,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from './config/layer-harness';
import {
  HOSTILE_STRINGS,
  SPECIAL_CHARACTERS,
  specialCharacterSeries,
} from './config/security-payloads';

/**
 * Entry check for the unit toolchain. It owns no module — it proves that
 * `config/` compiles and wires up (Prisma shim, nest-zod, envelope, both
 * layers) so a red module spec is about the module, never the setup.
 */
const ProbeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(12)
      .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'Code must be letters or digits, with single hyphens between them'),
    role: z.enum(RoleType),
  })
  .strict();

@Injectable()
class ProbeService {
  handle = jest.fn((body: unknown) => body);
}

@Controller('v1/app-probe')
class ProbeController {
  constructor(private readonly probeService: ProbeService) {}

  @Post()
  @ResponseMessage('Probe accepted')
  probe(@ZBody(ProbeSchema) body: z.infer<typeof ProbeSchema>) {
    return this.probeService.handle(body);
  }
}

const PATH = '/api/v1/app-probe';
const VALID = { code: 'CARES-01', role: Object.values(RoleType)[0] };

const fixtures: LayerFixture[] = [
  { name: 'valid body', input: VALID, expected: 'PASS' },
  { name: 'missing code', input: { role: VALID.role }, expected: 'FAIL', field: 'code' },
  { name: 'unknown role', input: { ...VALID, role: 'ROOT' }, expected: 'FAIL', field: 'role' },
  { name: 'extra key', input: { ...VALID, is_admin: true }, expected: 'FAIL' },
  ...HOSTILE_STRINGS.map((p): LayerFixture => ({
    name: `code ← ${p.category}: ${p.label}`,
    input: { ...VALID, code: p.value },
    expected: 'FAIL',
    field: 'code',
  })),
];

describe('app — unit toolchain', () => {
  let app: INestApplication;
  let service: ProbeService;

  beforeAll(async () => {
    app = await createApiLayerApp({ controllers: [ProbeController], providers: [ProbeService] });
    service = app.get(ProbeService);
  });
  afterAll(() => app.close());
  beforeEach(() => service.handle.mockClear());

  it('prisma shim exposes the real enums', () => {
    expect(Object.keys(RoleType).length).toBeGreaterThan(0);
  });

  it('payload catalogue covers every special character as a series', () => {
    const series = specialCharacterSeries().map((p) => p.value);
    for (const char of SPECIAL_CHARACTERS) {
      expect(series).toContain(char.repeat(3));
      expect(series).toContain(char.repeat(10));
    }
  });

  it('wraps success in the { ok, message, data } envelope', async () => {
    const outcome = await runApiLayer(app, { method: 'post', path: PATH, body: VALID });
    expect(outcome.status).toBe(201);
    expect(outcome.body).toEqual({ ok: true, message: 'Probe accepted', data: VALID });
  });

  it('masks unexpected errors as a 500 without leaking detail', async () => {
    service.handle.mockImplementationOnce(() => {
      throw new Error('syntax error at or near "OR"');
    });
    const outcome = await runApiLayer(app, { method: 'post', path: PATH, body: VALID });
    expect(outcome.status).toBe(500);
    expectSafeErrorEnvelope(outcome);
    expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
  });

  describe.each(fixtures)('$expected · $name', (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(ProbeSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(app, { method: 'post', path: PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(service.handle).not.toHaveBeenCalled();
      } else {
        expect(service.handle).toHaveBeenCalledTimes(1);
      }
    });
  });
});
