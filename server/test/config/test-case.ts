/**
 * Test-case catalogue for the unit suites — one row of the UNIT TESTING table per
 * case, the same shape the project document uses:
 *
 *   Module Name · Unit Name · Test Case ID · Test Case Description ·
 *   Expected Result · Actual Result · Result
 *
 * A case is a `describe` whose title carries that metadata; the `it`s inside it are
 * its checks (layer 1 schema, layer 2 API, one per payload variant, …). The case is
 * Passed only when every check inside it passes. `config/unit-case-reporter.js`
 * reads the titles back and prints the table.
 *
 * `kind` says what the input is, not what the test returns:
 *   valid   — a legitimate input; the expected result is that the system accepts it.
 *   invalid — an intentionally wrong input; the expected result is that the system
 *             refuses it in the stated way. A refusal that happens as stated is a
 *             Passed case — a wrong password being rejected is correct behaviour.
 * Valid cases run from `…/{unit}/valid/`, invalid ones from `…/{unit}/invalid/`.
 *
 * Two ways to declare cases, both written straight into a valid/ or invalid/ spec:
 *   - `defineCases(...)` — explicit cases (see `auth/login`).
 *   - `setCaseUnit(...)` in the module support + `fixtureCases` / `asCase` in the specs
 *     (every other module). These check that each case sits in the folder of its kind
 *     and fail the spec with "move it to …/" when one does not.
 */
import type { LayerFixture } from './layer-harness';

export type CaseKind = 'valid' | 'invalid';

export interface CaseMeta {
  id: string;
  module: string;
  unit: string;
  kind: CaseKind;
  description: string;
  expected: string;
}

/** Field separator inside a case title. Never used in descriptions. */
export const CASE_SEPARATOR = ' ¦ ';

export const caseTitle = (meta: CaseMeta) =>
  [meta.id, meta.module, meta.unit, meta.kind, meta.description, meta.expected].join(CASE_SEPARATOR);

export interface CaseCatalogue {
  module: string;
  unit: string;
  kind: CaseKind;
  /** Case-ID prefix for this unit, e.g. `LOGIN` → `LOGIN-V-001` / `LOGIN-I-001`. */
  prefix: string;
}

/**
 * Returns `testCase(description, expected, body)`. IDs are numbered in declaration
 * order, so append new cases at the end of a file to keep existing IDs stable.
 */
export const defineCases = ({ module, unit, kind, prefix }: CaseCatalogue) => {
  let sequence = 0;
  const tag = kind === 'valid' ? 'V' : 'I';

  return (description: string, expected: string, body: () => void) => {
    sequence += 1;
    const id = `${prefix}-${tag}-${String(sequence).padStart(3, '0')}`;
    describe(caseTitle({ id, module, unit, kind, description, expected }), body);
  };
};

/* ─────────────────────── setCaseUnit · asCase · fixtureCases ─────────────────────── */

/** `valid` / `invalid` from the folder of the spec file Jest is running; null elsewhere. */
export const currentKind = (): CaseKind | null => {
  const path = (expect.getState().testPath ?? '').replace(/\\/g, '/');
  if (path.includes('/invalid/')) return 'invalid';
  if (path.includes('/valid/')) return 'valid';
  return null;
};

let unit: Omit<CaseCatalogue, 'kind'> | null = null;
const sequences: Record<CaseKind, number> = { valid: 0, invalid: 0 };

/**
 * Names the module and unit every case registered after this belongs to. Call it at
 * the top of the module's `*-support.ts` — Jest isolates modules per spec file, so the
 * setting and the ID counters are per run of a valid/ or invalid/ spec.
 */
export const setCaseUnit = (catalogue: Omit<CaseCatalogue, 'kind'>) => {
  unit = catalogue;
};

const registerCase = (kind: CaseKind, description: string, expected: string, body: () => void) => {
  const active = currentKind();
  if (active !== null && active !== kind) {
    throw new Error(
      `"${description}" is a${kind === 'invalid' ? 'n' : ''} ${kind} case declared in a ${active}/ spec — move it to ${kind}/.`,
    );
  }
  if (!unit) throw new Error('setCaseUnit(...) must run before cases are declared');

  sequences[kind] += 1;
  const id = `${unit.prefix}-${kind === 'valid' ? 'V' : 'I'}-${String(sequences[kind]).padStart(3, '0')}`;
  describe(caseTitle({ id, module: unit.module, unit: unit.unit, kind, description, expected }), body);
};

const sentence = (text: string) => {
  const clean = text
    .replace(/^(FAIL|PASS) · /, '')
    .replace(/ · \$title$/, '')
    .replace(/[:·]?\s*\$category: \$label$/, '')
    .replace(/:\s*\$label$/, '')
    .replace(/:\s*%j$/, '')
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

/**
 * Wraps one plain check as its own case: `asCase('invalid', 'The database fails').it(...)`.
 * The check's title becomes the Expected Result unless `expected` is given.
 */
export const asCase = (kind: CaseKind, description: string, expected?: string): { it: jest.It } => {
  const caseIt = ((title: string, fn: jest.ProvidesCallback, timeout?: number) =>
    registerCase(kind, description, expected ?? sentence(title), () => it(title, fn, timeout))) as unknown as jest.It;

  (caseIt as any).each =
    (table: any) =>
    (title: string, fn: (...args: any[]) => any, timeout?: number) =>
      registerCase(kind, description, expected ?? sentence(title), () => (it.each as any)(table)(title, fn, timeout));

  return { it: caseIt };
};

const CATEGORY_LABEL: Record<string, string> = {
  'sql-tautology': 'SQL injection tautologies (OR 1=1)',
  'sql-comment': 'SQL injection with comment terminators',
  'sql-stacked': 'stacked SQL statements (; DROP …)',
  'sql-union': 'UNION-based SQL injection',
  'sql-blind': 'blind / time-based SQL injection',
  'sql-encoded': 'encoded SQL injection',
  'special-char-series': 'special-character series',
  'control-char': 'control characters (null byte, CRLF, tab …)',
  'unicode-confusable': 'look-alike unicode characters',
  xss: 'XSS markup',
  'path-traversal': 'path-traversal strings',
  ssrf: 'internal / non-https URLs (SSRF)',
  'private-object-key': 'private storage keys',
  'operator-injection': 'objects, arrays, numbers, booleans or null instead of text',
  'prototype-pollution': '__proto__ / constructor.prototype keys',
};

const FAMILY = /^(.+?) ← ([a-z-]+): (.+)$/;

const expectedFor = (fixture: LayerFixture<any>) => {
  if (fixture.expected === 'PASS') return 'Request accepted and passed to the service once';
  const on = fixture.field ? ` on ${fixture.field}` : '';
  const message = typeof fixture.message === 'string' ? ` — "${fixture.message}"` : '';
  return `Request rejected with "Validation failed"${on} (400)${message}; nothing reaches the service`;
};

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Drop-in for `describe.each(fixtures)('$expected · $name', body)`. Registers the PASS
 * fixtures as valid cases and the FAIL fixtures as invalid cases; a payload family
 * (`field ← category: label`, or `mass assignment: …`) becomes ONE case whose checks
 * are its variants, so the table shows one row per scenario.
 */
export const fixtureCases = <F extends LayerFixture<any>>(fixtures: F[], body: (fixture: F) => void) => {
  const groups: { key: string; items: F[] }[] = [];
  const byKey = new Map<string, F[]>();

  fixtures.forEach((fixture, index) => {
    const family = FAMILY.exec(fixture.name);
    const key = family
      ? `${fixture.expected}|${family[1]}|${family[2]}|${fixture.field ?? ''}`
      : fixture.name.startsWith('mass assignment')
        ? `${fixture.expected}|mass-assignment`
        : `${fixture.expected}|single|${index}`;
    if (!byKey.has(key)) {
      const items: F[] = [];
      byKey.set(key, items);
      groups.push({ key, items });
    }
    byKey.get(key)!.push(fixture);
  });

  for (const { items } of groups) {
    const first = items[0];
    const kind: CaseKind = first.expected === 'PASS' ? 'valid' : 'invalid';
    const family = FAMILY.exec(first.name);

    if (items.length === 1 && !family && !first.name.startsWith('mass assignment')) {
      registerCase(kind, capitalise(first.name), expectedFor(first), () => body(first));
      continue;
    }

    const variants = ` (${items.length} variant${items.length === 1 ? '' : 's'})`;
    const description = family
      ? `${kind === 'invalid' ? 'Attacker enters' : 'User enters'} ${CATEGORY_LABEL[family[2]] ?? family[2]} in ${family[1]}${variants}`
      : `Attacker adds privileged fields (role_type, is_protected, user_id, permissions) to the body${variants}`;

    registerCase(kind, description, expectedFor(first), () => {
      for (const fixture of items) {
        const label = FAMILY.exec(fixture.name)?.[3] ?? fixture.name.replace(/^mass assignment:\s*/, '');
        describe(label, () => body(fixture));
      }
    });
  }
};
