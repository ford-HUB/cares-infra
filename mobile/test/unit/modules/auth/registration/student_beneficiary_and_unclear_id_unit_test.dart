// Student beneficiaries take the ID + face path and open their Volunteer side;
// unclear IDs offer Retake / Continue / Manual (portrait included);
// server-opened sides start unlocked.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/auth/data/id_image_pre_validator.dart';
import 'package:mobile/features/auth/domain/beneficiary_profile.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';
import 'package:mobile/features/auth/presentation/widgets/id_recognition_fallback_message.dart';
import 'package:mobile/features/auth/presentation/widgets/id_unclear_dialog.dart';

Future<IdUnclearChoice?> _openDialog(
  WidgetTester tester, {
  required bool offersManual,
}) async {
  IdUnclearChoice? choice;
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () async {
              choice = await showIdUnclearDialog(
                context,
                result: const IdImageCheckResult(
                  side: IdCardSide.front,
                  issues: [IdImageIssue.blurry, IdImageIssue.faceBlurry],
                ),
                offersManualRegistration: offersManual,
              );
            },
            child: const Text('open'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
  return choice;
}

void main() {
  group('beneficiary type', () {
    test('an individual must pick Regular or Student to continue', () {
      const individual = BeneficiaryProfile(kind: BeneficiaryKind.individual);
      expect(individual.isComplete, isFalse);
      expect(
        individual.copyWith(category: BeneficiaryCategory.regular).isComplete,
        isTrue,
      );
      expect(
        individual.copyWith(category: BeneficiaryCategory.student).isStudent,
        isTrue,
      );
    });

    test('switching to an organization drops the student answer', () {
      const student = BeneficiaryProfile(
        kind: BeneficiaryKind.individual,
        category: BeneficiaryCategory.student,
      );
      final organization = student.asOrganization();
      expect(organization.category, isNull);
      expect(organization.isStudent, isFalse);
      expect(organization.asIndividual().isStudent, isFalse);
    });
  });

  group('ID portrait issues', () {
    test('a missing or blurry portrait offers the unclear-ID fallback', () {
      for (final issue in [
        IdImageIssue.faceNotFound,
        IdImageIssue.faceBlurry,
      ]) {
        expect(
          IdRecognitionFallbackMessage.offeredFor(
            IdImageCheckResult(side: IdCardSide.front, issues: [issue]),
          ),
          isTrue,
          reason: issue.name,
        );
        // A detector can miss a small printed portrait, so it never strands
        // a registrant who has no fallback.
        expect(issue.overridable, isTrue, reason: issue.name);
      }
    });
  });

  group('unclear ID pop-up', () {
    testWidgets('a volunteer can retake, continue, or register manually', (
      tester,
    ) async {
      await _openDialog(tester, offersManual: true);

      expect(find.text('Your ID isn\'t clear'), findsOne);
      expect(find.textContaining('couldn\'t read the front'), findsOne);
      expect(find.textContaining('The photo on your ID is blurry'), findsOne);
      expect(find.text('Retake Photo'), findsOne);
      expect(find.text('Continue Anyway'), findsOne);
      expect(find.text('Register Manually'), findsOne);
    });

    testWidgets('each button returns its choice', (tester) async {
      for (final (label, expected) in [
        ('Retake Photo', IdUnclearChoice.retake),
        ('Continue Anyway', IdUnclearChoice.proceed),
        ('Register Manually', IdUnclearChoice.manual),
      ]) {
        IdUnclearChoice? choice;
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () async {
                    choice = await showIdUnclearDialog(
                      context,
                      result: const IdImageCheckResult(
                        side: IdCardSide.back,
                        issues: [IdImageIssue.glare],
                      ),
                      offersManualRegistration: true,
                    );
                  },
                  child: const Text('open'),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('open'));
        await tester.pumpAndSettle();
        await tester.tap(find.text(label));
        await tester.pumpAndSettle();
        expect(choice, expected, reason: label);
      }
    });

    testWidgets('without manual registration only retake and continue show', (
      tester,
    ) async {
      await _openDialog(tester, offersManual: false);

      expect(find.text('Retake Photo'), findsOne);
      expect(find.text('Continue Anyway'), findsOne);
      expect(find.text('Register Manually'), findsNothing);
    });
  });

  group('sides opened with the account', () {
    setUp(RoleAccountStore.instance.clear);
    tearDown(RoleAccountStore.instance.clear);

    test('a student beneficiary signs in with the Volunteer side open', () {
      RoleAccountStore.instance.signIn(
        roleType: 'BENEFICIARY',
        email: 'student.ben@cares.local',
        unlockedRoles: const ['VOLUNTEER'],
      );

      final store = RoleAccountStore.instance;
      expect(store.active?.roleType, 'BENEFICIARY');
      expect(store.isUnlocked('VOLUNTEER'), isTrue);
      expect(store.isUnlocked('DONOR'), isFalse);
      // Opened by the student sign-up, not by a director's role-access grant.
      expect(store.volunteerFromOutsideSchool, isFalse);
    });

    test('a regular beneficiary still has to unlock the Volunteer side', () {
      RoleAccountStore.instance.signIn(
        roleType: 'BENEFICIARY',
        email: 'regular.ben@cares.local',
      );

      expect(RoleAccountStore.instance.isUnlocked('VOLUNTEER'), isFalse);
    });
  });
}
