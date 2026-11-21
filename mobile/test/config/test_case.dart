// Test-case catalogue for the mobile unit suites — one row of the UNIT TESTING
// table per case, the same shape the project document uses:
//
//   Module Name · Unit Name · Date Tested · Test Case ID ·
//   Test Case Description · Expected Result · Actual Result · Result
//
// A case is a `test` whose name carries that metadata, declared inside a
// `unit(...)` group. `tool/unit_case_report.dart` runs the suites, reads the
// names back and prints the table, filling in Date Tested, Actual Result and
// Result (Passed / Failed) from the run.
//
// An intentionally wrong input that is refused as stated (a missing name, a
// taken ID number) is a Passed case — the refusal is the correct behaviour.
//
// Mirrors server/test/config/test-case.ts.

import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

/// Field separator inside a case name. Never used in descriptions.
const caseSeparator = ' ¦ ';

/// Declares the cases of one test file.
///
/// ```dart
/// final cases = TestCases(module: 'Process Registration', prefix: 'REG-VOL');
///
/// cases.unit('Register (Personal Details)', () {
///   cases.test(
///     'User does not input their age',
///     expected: 'The form shows "Age is required" and cannot continue',
///     () { ... },
///   );
/// });
/// ```
///
/// IDs are numbered in declaration order (`REG-VOL-001`, `REG-VOL-002`, …), so
/// append new cases at the end of a unit to keep existing IDs stable.
class TestCases {
  TestCases({required this.module, required this.prefix});

  final String module;
  final String prefix;

  int _sequence = 0;
  String? _unit;

  /// Groups the cases of one unit (e.g. `Register (Account Info)`).
  void unit(String name, void Function() body) {
    group(name, () {
      final previous = _unit;
      _unit = name;
      body();
      _unit = previous;
    });
  }

  /// One case: what the user does, what the system should do, and the check.
  void test(
    String description,
    FutureOr<void> Function() body, {
    required String expected,
  }) {
    final unit = _unit;
    if (unit == null) {
      throw StateError('Declare "$description" inside cases.unit(...)');
    }
    assert(
      !description.contains(caseSeparator) && !expected.contains(caseSeparator),
      'Case text must not contain "$caseSeparator"',
    );

    _sequence += 1;
    final id = '$prefix-${_sequence.toString().padLeft(3, '0')}';
    testFn([id, module, unit, description, expected].join(caseSeparator), body);
  }
}

/// flutter_test's `test`, aliased so [TestCases.test] can call it.
const testFn = test;
