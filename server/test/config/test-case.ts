/**
 * A case is a `describe` whose title carries its metadata; it passes only if all
 * its `it`s do. `config/unit-case-reporter.js` prints the table from the titles.
 * `kind` is the input, not the outcome: an invalid input refused as stated passes.
 * `setCaseUnit` + `fixtureCases`/`asCase` also fail a case in the wrong kind folder.
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

/** Must never appear in a description. */
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

/** IDs follow declaration order: append new cases to keep IDs stable. */
export const defineCases = ({ module, unit, kind, prefix }: CaseCatalogue) => {
  let sequence = 0;
  const tag = kind === 'valid' ? 'V' : 'I';

  return (description: string, expected: string, body: () => void) => {
    sequence += 1;
    const id = `${prefix}-${tag}-${String(sequence).padStart(3, '0')}`;
    describe(caseTitle({ id, module, unit, kind, description, expected }), body);
  };
};

export const currentKind = (): CaseKind | null => {
  const path = (expect.getState().testPath ?? '').replace(/\\/g, '/');
  if (path.includes('/invalid/')) return 'invalid';
  if (path.includes('/valid/')) return 'valid';
  return null;
};

let unit: Omit<CaseCatalogue, 'kind'> | null = null;
const sequences: Record<CaseKind, number> = { valid: 0, invalid: 0 };

/** Call atop `*-support.ts`; Jest isolates modules per spec, so unit and ID counters reset per spec. */
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

/** One check as its own case; its title is the Expected Result unless `expected` is given. */
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

/** `describe.each` drop-in: PASS → valid, FAIL → invalid; a payload family is one case, a check per variant. */
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
