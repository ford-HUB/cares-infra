// Prints the UNIT TESTING table for every case declared with `TestCases`
// (see test/config/test_case.dart): one row per case, grouped by module and
// unit, with Date Tested, Actual Result and Result filled in from the run.
//
//   dart run tool/unit_case_report.dart [test paths...] [--csv=report.csv]
//
// With no paths it runs the whole test/ folder. `--csv` also writes every
// case with all eight columns (Module Name, Unit Name, Date Tested, Test Case
// ID, Test Case Description, Expected Result, Actual Result, Result), ready
// to paste into the project document.
//
// Mirrors server/test/config/unit-case-reporter.js.

import 'dart:convert';
import 'dart:io';

const _separator = ' ¦ ';

class _Case {
  _Case(this.id, this.module, this.unit, this.description, this.expected);

  final String id;
  final String module;
  final String unit;
  final String description;
  final String expected;

  String result = 'Failed';
  String? reason;

  /// `REG-VOL-001` → `REG-VOL`.
  String get prefix => id.substring(0, id.lastIndexOf('-'));

  bool get passed => result == 'Passed';
  String get actual => passed
      ? 'Performed as expected'
      : 'Not as expected: ${reason ?? 'the check did not finish'}';
}

/// `Register (ID Upload) REG-VOL-001 ¦ module ¦ unit ¦ description ¦ expected`
/// — the groups flutter_test prepends end up before the ID.
_Case? _parse(String name) {
  final parts = name.split(_separator);
  if (parts.length != 5) return null;
  final id = parts[0].trim().split(' ').last;
  return _Case(id, parts[1], parts[2], parts[3], parts[4]);
}

String _firstLine(String error) {
  final line = error
      .split('\n')
      .map((l) => l.trim())
      .firstWhere((l) => l.isNotEmpty, orElse: () => 'check failed');
  return line.length > 160 ? '${line.substring(0, 157)}...' : line;
}

String _today() {
  final d = DateTime.now();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(d.month)}/${two(d.day)}/${d.year}';
}

List<String> _wrap(String text, int width) {
  final out = <String>[];
  var line = '';
  for (var word in text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty)) {
    while (word.length > width) {
      if (line.isNotEmpty) {
        out.add(line);
        line = '';
      }
      out.add(word.substring(0, width));
      word = word.substring(width);
    }
    if (line.isEmpty) {
      line = word;
    } else if (line.length + 1 + word.length <= width) {
      line += ' $word';
    } else {
      out.add(line);
      line = word;
    }
  }
  out.add(line);
  return out;
}

String _table(List<(String, int)> columns, List<List<String>> rows) {
  String border(String l, String m, String r) =>
      l + columns.map((c) => '─' * (c.$2 + 2)).join(m) + r;

  String line(List<String> cells) {
    final wrapped = [
      for (var i = 0; i < cells.length; i++) _wrap(cells[i], columns[i].$2),
    ];
    final height = wrapped.map((w) => w.length).reduce((a, b) => a > b ? a : b);
    return [
      for (var row = 0; row < height; row++)
        '│ ${[for (var i = 0; i < cells.length; i++) (row < wrapped[i].length ? wrapped[i][row] : '').padRight(columns[i].$2)].join(' │ ')} │',
    ].join('\n');
  }

  return [
    border('┌', '┬', '┐'),
    line([for (final c in columns) c.$1]),
    for (final row in rows) ...[border('├', '┼', '┤'), line(row)],
    border('└', '┴', '┘'),
  ].join('\n');
}

String _csvCell(String value) => '"${value.replaceAll('"', '""')}"';

Future<void> main(List<String> args) async {
  final csvPath = args
      .where((a) => a.startsWith('--csv='))
      .map((a) => a.substring('--csv='.length))
      .firstOrNull;
  final paths = args.where((a) => !a.startsWith('--')).toList();

  final process = await Process.start('flutter', [
    'test',
    '--reporter',
    'json',
    ...paths,
  ], runInShell: true);
  process.stderr.transform(utf8.decoder).listen(stderr.write);

  final byTestId = <int, _Case>{};
  final cases = <String, _Case>{};
  var unclassified = 0;
  final brokenSuites = <String>[];

  await for (final raw
      in process.stdout
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
    if (!raw.startsWith('{')) continue;
    final Map<String, dynamic> event;
    try {
      event = jsonDecode(raw) as Map<String, dynamic>;
    } on FormatException {
      continue;
    }

    switch (event['type']) {
      case 'testStart':
        final test = event['test'] as Map<String, dynamic>;
        final name = test['name'] as String? ?? '';
        final parsed = _parse(name);
        if (parsed != null) {
          byTestId[test['id'] as int] = parsed;
          cases['${parsed.module}$_separator${parsed.unit}$_separator${parsed.id}'] =
              parsed;
        } else if (name.isNotEmpty &&
            !name.startsWith('loading ') &&
            // setUpAll / tearDownAll run as hidden "(setUpAll)" tests.
            !RegExp(r'\((setUpAll|tearDownAll)\)$').hasMatch(name)) {
          unclassified++;
        }
      case 'error':
        final found = byTestId[event['testID']];
        found?.reason ??= _firstLine(event['error'] as String? ?? '');
      case 'testDone':
        if (event['hidden'] == true) continue;
        final found = byTestId[event['testID']];
        if (found != null && event['result'] == 'success') {
          found.result = 'Passed';
        }
      case 'suite':
        break;
      case 'done':
        if (event['success'] != true && cases.isEmpty) {
          brokenSuites.add('the run reported failures before any case ran');
        }
    }
  }
  final exitCode = await process.exitCode;

  final date = _today();
  final out = StringBuffer()
    ..writeln()
    ..writeln('UNIT TESTING')
    ..writeln('Date Tested: $date');

  final groups = <String, List<_Case>>{};
  for (final c in cases.values) {
    // The ID prefix keeps same-named units of different files apart, e.g.
    // Register (Personal Details) for REG-VOL and for REG-BEN.
    groups
        .putIfAbsent(
          '${c.module}$_separator${c.unit}$_separator${c.prefix}',
          () => [],
        )
        .add(c);
  }

  int byId(_Case a, _Case b) => a.id.compareTo(b.id);
  final ordered = groups.values.toList()
    ..forEach((g) => g.sort(byId))
    ..sort((a, b) => byId(a.first, b.first));

  for (final group in ordered) {
    final passed = group.where((c) => c.passed).length;
    out
      ..writeln()
      ..writeln(
        'Module: ${group.first.module}   Unit: ${group.first.unit}   '
        '[${group.first.prefix}]   '
        '$passed/${group.length} passed',
      )
      ..writeln(
        _table(
          [
            ('Test Case ID', 12),
            ('Test Case Description', 38),
            ('Expected Result', 38),
            ('Actual Result', 22),
            ('Result', 6),
          ],
          [
            for (final c in group)
              [c.id, c.description, c.expected, c.actual, c.result],
          ],
        ),
      );
  }

  final failed = cases.values.where((c) => !c.passed).length;
  out
    ..writeln()
    ..writeln(
      'Test Cases: ${failed > 0 ? '$failed failed, ' : ''}'
      '${cases.length - failed} passed, ${cases.length} total',
    );
  if (unclassified > 0) {
    out.writeln('Not in case format: $unclassified tests (not in the table).');
  }
  for (final suite in brokenSuites) {
    out.writeln('Suite problem: $suite');
  }
  stdout.write(out);

  if (csvPath != null) {
    final csv = StringBuffer()
      ..writeln(
        [
          'Module Name',
          'Unit Name',
          'Date Tested',
          'Test Case ID',
          'Test Case Description',
          'Expected Result',
          'Actual Result',
          'Result',
        ].map(_csvCell).join(','),
      );
    for (final group in ordered) {
      for (final c in group) {
        csv.writeln(
          [
            c.module,
            c.unit,
            date,
            c.id,
            c.description,
            c.expected,
            c.actual,
            c.result,
          ].map(_csvCell).join(','),
        );
      }
    }
    File(csvPath).writeAsStringSync(csv.toString());
    stdout.writeln('Wrote $csvPath');
  }

  exit(exitCode);
}
