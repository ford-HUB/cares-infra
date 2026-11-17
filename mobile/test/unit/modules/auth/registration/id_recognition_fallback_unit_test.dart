// Unit tests for the ID recognition fallback offered to staff and alumni
// sign-ups: when an ID photo is blurry, unclear or read with low accuracy, the
// registrant is told the ID couldn't be recognized and may Proceed Anyway or
// switch to Manual Registration.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/data/id_image_pre_validator.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';
import 'package:mobile/features/auth/presentation/widgets/id_recognition_fallback_message.dart';

Future<void> _pump(
  WidgetTester tester,
  IdImageCheckResult result, {
  VoidCallback? onProceedAnyway,
  VoidCallback? onManualRegistration,
}) {
  return tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: IdRecognitionFallbackMessage(
            result: result,
            onProceedAnyway: onProceedAnyway ?? () {},
            onManualRegistration: onManualRegistration ?? () {},
          ),
        ),
      ),
    ),
  );
}

void main() {
  group('when the fallback is offered', () {
    test('a blurry, dark, glary or unreadable photo offers it', () {
      for (final issue in [
        IdImageIssue.blurry,
        IdImageIssue.tooDark,
        IdImageIssue.overexposed,
        IdImageIssue.glare,
        IdImageIssue.lowContrast,
        IdImageIssue.tooSmall,
        IdImageIssue.noReadableText,
        IdImageIssue.missingIdDetails,
      ]) {
        expect(
          IdRecognitionFallbackMessage.offeredFor(
            IdImageCheckResult(side: IdCardSide.front, issues: [issue]),
          ),
          isTrue,
          reason: issue.name,
        );
      }
    });

    test('a file that is not an image is not offered it', () {
      expect(
        IdRecognitionFallbackMessage.offeredFor(
          const IdImageCheckResult(
            side: IdCardSide.front,
            issues: [IdImageIssue.unreadableFile],
          ),
        ),
        isFalse,
      );
    });

    test('a photo that passed is not offered it', () {
      expect(
        IdRecognitionFallbackMessage.offeredFor(
          const IdImageCheckResult(side: IdCardSide.back, issues: []),
        ),
        isFalse,
      );
    });
  });

  group('the message', () {
    testWidgets('says the ID was not recognized and lists why', (tester) async {
      await _pump(
        tester,
        const IdImageCheckResult(
          side: IdCardSide.front,
          issues: [IdImageIssue.blurry, IdImageIssue.missingIdDetails],
          missingFields: ['name', 'ID number'],
        ),
      );

      expect(find.text('We couldn\'t properly recognize your ID'), findsOne);
      expect(find.textContaining('The front photo'), findsOne);
      expect(find.textContaining('The photo is blurry'), findsOne);
      expect(
        find.textContaining('We couldn\'t read your name and ID number'),
        findsOne,
      );
      expect(find.text('Proceed Anyway'), findsOne);
      expect(find.text('Manual Registration'), findsOne);
    });

    testWidgets('Proceed Anyway and Manual Registration call back', (
      tester,
    ) async {
      var proceeded = 0;
      var manual = 0;
      await _pump(
        tester,
        const IdImageCheckResult(
          side: IdCardSide.back,
          issues: [IdImageIssue.blurry],
        ),
        onProceedAnyway: () => proceeded++,
        onManualRegistration: () => manual++,
      );

      await tester.tap(find.text('Proceed Anyway'));
      expect((proceeded, manual), (1, 0));

      await tester.tap(find.text('Manual Registration'));
      expect((proceeded, manual), (1, 1));
    });
  });
}
