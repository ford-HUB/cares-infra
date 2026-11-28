// Manual-registration fallback on the face scan, when an alumni selfie can't
// match an unclear alumni ID.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/presentation/widgets/face_match_fallback_message.dart';

Future<void> _pump(
  WidgetTester tester, {
  VoidCallback? onManualRegistration,
  String idLabel = 'alumni ID',
}) {
  return tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: FaceMatchFallbackMessage(
            idLabel: idLabel,
            onManualRegistration: onManualRegistration,
          ),
        ),
      ),
    ),
  );
}

void main() {
  group('FaceMatchFallbackMessage', () {
    testWidgets('names the ID that could not be matched', (tester) async {
      await _pump(tester, onManualRegistration: () {});

      expect(
        find.text('We couldn\'t match your face to your alumni ID'),
        findsOneWidget,
      );
      expect(find.text('Manual Registration'), findsOneWidget);
    });

    testWidgets('Manual Registration calls back', (tester) async {
      var tapped = 0;
      await _pump(tester, onManualRegistration: () => tapped++);

      await tester.tap(find.byKey(const ValueKey('face-fallback-manual')));
      expect(tapped, 1);
    });

    testWidgets('the button is disabled while a match is being checked', (
      tester,
    ) async {
      await _pump(tester);

      final button = tester.widget<FilledButton>(
        find.byKey(const ValueKey('face-fallback-manual')),
      );
      expect(button.onPressed, isNull);
    });
  });
}
