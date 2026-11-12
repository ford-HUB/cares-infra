/**
 * Prints the UNIT TESTING table for every case declared with `defineCases`
 * (see `config/test-case.ts`): one row per case, grouped by module, unit and
 * kind (valid / invalid inputs). Jest's `summary` reporter runs after this one
 * and adds the totals and the detail of any failed check.
 *
 * Plain CommonJS: Jest loads reporters without the ts-jest transform.
 */
const SEPARATOR = ' ¦ ';

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const green = (t) => paint('32', t);
const red = (t) => paint('31', t);
const bold = (t) => paint('1', t);
const dim = (t) => paint('2', t);

const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

const ROUTE = /^(POST|GET|PUT|PATCH|DELETE) \//;

/** `POST /api/v1/users/:id/reissue-credentials` → `Reissue credentials`. */
const routeLabel = (title) => {
  const segments = title.split(' ')[1].split('/').filter((s) => s && !s.startsWith(':') && !/^(api|v\d+)$/.test(s));
  const last = (segments.pop() || title).replace(/-/g, ' ');
  return last.charAt(0).toUpperCase() + last.slice(1);
};

const parseCase = (title) => {
  const parts = title.split(SEPARATOR);
  if (parts.length !== 6) return null;
  const [id, module, unit, kind, description, expected] = parts;
  return { id, module, unit, kind, description, expected };
};

/** First line of a failure that says something, without colour or stack. */
const firstReason = (failureMessages) => {
  const lines = stripAnsi(failureMessages.join('\n'))
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('at ') && !/^Error:?$/.test(l));
  const expected = lines.find((l) => /^Expected( value)?:/.test(l));
  const received = lines.find((l) => /^Received( value)?:/.test(l));
  const line =
    expected && received
      ? `${expected.replace(/^Expected( value)?:\s*/, 'expected ')}, ${received.replace(/^Received( value)?:\s*/, 'received ')}`
      : (lines[0] || 'check failed').replace(/^Error:\s*/, '');
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
};

const wrap = (text, width) => {
  const out = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (w.length > width) {
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(w.slice(0, width));
        w = w.slice(width);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= width) line += ` ${w}`;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out.length ? out : [''];
};

const pad = (text, width) => text + ' '.repeat(Math.max(0, width - stripAnsi(text).length));

const renderTable = (columns, rows) => {
  const border = (l, m, r) => l + columns.map((c) => '─'.repeat(c.width + 2)).join(m) + r;
  const line = (cells) => {
    const wrapped = cells.map((cell, i) => (cell.raw ? [cell.text] : wrap(cell.text, columns[i].width)));
    const height = Math.max(...wrapped.map((w) => w.length));
    const out = [];
    for (let row = 0; row < height; row += 1) {
      out.push(
        `│ ${wrapped
          .map((w, i) => {
            const value = w[row] || '';
            return pad(cells[i].paint && value ? cells[i].paint(value) : value, columns[i].width);
          })
          .join(' │ ')} │`,
      );
    }
    return out.join('\n');
  };

  const out = [border('┌', '┬', '┐'), line(columns.map((c) => ({ text: c.title, paint: bold })))];
  for (const row of rows) {
    out.push(border('├', '┼', '┤'));
    out.push(line(row));
  }
  out.push(border('└', '┴', '┘'));
  return out.join('\n');
};

const today = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

class UnitCaseReporter {
  onRunComplete(_contexts, results) {
    const cases = new Map();
    const unclassified = new Map();
    const brokenSuites = [];

    for (const file of results.testResults) {
      if (file.testExecError) {
        brokenSuites.push(file.testFilePath);
        continue;
      }
      for (const check of file.testResults) {
        if (check.status === 'pending' || check.status === 'skipped' || check.status === 'todo') continue;

        const titles = [...check.ancestorTitles, check.title];
        const ownerIndex = titles.findIndex((t) => parseCase(t));
        const owner = ownerIndex >= 0 ? parseCase(titles[ownerIndex]) : null;
        if (owner) {
          // Groups between the file's root describe and the case: a route (shown only
          // when the unit has several, see below) and a part of the request (id, body).
          const between = titles.slice(1, ownerIndex);
          const route = between.filter((t) => ROUTE.test(t)).pop();
          const scope = between.filter((t) => !ROUTE.test(t));
          owner.route = route ? routeLabel(route) : '';
          if (scope.length) owner.description = `${scope.join(' › ')}: ${owner.description}`;
        }
        if (!owner) {
          unclassified.set(file.testFilePath, (unclassified.get(file.testFilePath) || 0) + 1);
          continue;
        }

        const key = `${owner.module}${SEPARATOR}${owner.unit}${SEPARATOR}${owner.id}`;
        if (!cases.has(key)) cases.set(key, { ...owner, total: 0, failed: [] });
        const entry = cases.get(key);
        entry.total += 1;
        if (check.status === 'failed') entry.failed.push(check);
      }
    }

    const out = [];
    const width = Math.max(110, Math.min(process.stdout.columns || 160, 190));

    if (cases.size) {
      const groups = new Map();
      for (const c of cases.values()) {
        const key = [c.module, c.unit, c.kind].join(SEPARATOR);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      }

      const fixed = 13 + 7 + 6; // id, checks, result
      const free = width - fixed - 6 * 3 - 1;
      const columns = [
        { title: 'Test Case ID', width: 13 },
        { title: 'Test Case Description', width: Math.floor(free * 0.36) },
        { title: 'Expected Result', width: Math.floor(free * 0.36) },
        { title: 'Actual Result', width: free - 2 * Math.floor(free * 0.36) },
        { title: 'Checks', width: 7 },
        { title: 'Result', width: 6 },
      ];

      const order = (k) => (k === 'valid' ? 0 : 1);
      const sortedGroups = [...groups.values()].sort(
        (a, b) =>
          a[0].module.localeCompare(b[0].module) ||
          a[0].unit.localeCompare(b[0].unit) ||
          order(a[0].kind) - order(b[0].kind),
      );

      out.push('', bold('UNIT TESTING'), dim(`Date Tested: ${today()}`));

      for (const group of sortedGroups) {
        const { module, unit, kind } = group[0];
        const passed = group.filter((c) => !c.failed.length).length;
        const tally = passed === group.length ? green(`${passed}/${group.length} passed`) : red(`${passed}/${group.length} passed`);
        out.push(
          '',
          `${bold(`Module: ${module}`)}   ${bold(`Unit: ${unit}`)}   ${dim(kind === 'valid' ? 'valid inputs' : 'invalid inputs')}   ${tally}`,
        );

        const severalRoutes = new Set(group.map((c) => c.route).filter(Boolean)).size > 1;
        const rows = group
          .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
          .map((c) => {
            const description = severalRoutes && c.route ? `[${c.route}] ${c.description}` : c.description;
            const ok = c.failed.length === 0;
            const actual = ok
              ? 'Performed as expected'
              : `Not as expected (${c.failed.length}/${c.total} checks failed): ${firstReason(c.failed[0].failureMessages)}`;
            return [
              { text: c.id },
              { text: description },
              { text: c.expected },
              { text: actual, paint: ok ? undefined : red },
              { text: `${c.total - c.failed.length}/${c.total}` },
              { text: ok ? 'Passed' : 'Failed', paint: ok ? green : red },
            ];
          });

        out.push(renderTable(columns, rows));
      }

      const all = [...cases.values()];
      const failed = all.filter((c) => c.failed.length);
      out.push(
        '',
        `${bold('Test Cases:')}  ${failed.length ? red(`${failed.length} failed, `) : ''}${green(`${all.length - failed.length} passed`)}, ${all.length} total` +
          `   ${dim(`(valid ${all.filter((c) => c.kind === 'valid').length} · invalid ${all.filter((c) => c.kind === 'invalid').length})`)}`,
      );
    }

    if (unclassified.size) {
      const total = [...unclassified.values()].reduce((a, b) => a + b, 0);
      out.push(dim(`Not in case format: ${total} checks in ${unclassified.size} file(s) — counted in the totals below only:`));
      const root = process.cwd().replace(/\\/g, '/');
      for (const [file, count] of unclassified) {
        out.push(dim(`  ${file.replace(/\\/g, '/').replace(`${root}/`, '')} (${count})`));
      }
    }
    for (const file of brokenSuites) out.push(red(`Suite failed to run: ${file}`));

    if (out.length) process.stdout.write(`${out.join('\n')}\n\n`);
  }
}

module.exports = UnitCaseReporter;
