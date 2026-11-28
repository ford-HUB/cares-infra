import 'package:flutter/material.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/screens/mobile_profile_edit_screen.dart';

/// Locks a role's actions until the server says its profile is complete (via
/// [ProfileService]); never computed locally.
class ProfileGate {
  ProfileGate._();

  /// Null before the first read.
  static ProfileCompletion? completionFor(String roleType) =>
      RoleAccountStore.instance.byType(roleType)?.serverProfile?.completion;

  /// Signed-out prototype paths are never locked.
  static bool isUnlocked(String roleType) {
    if (!AuthSession.isSignedIn) return true;
    return completionFor(roleType)?.complete ?? false;
  }

  /// Otherwise explains what's missing and offers the form; proceeds only if
  /// that save completes the profile.
  static Future<bool> ensureComplete(
    BuildContext context,
    String roleType,
  ) async {
    if (!AuthSession.isSignedIn) return true;

    // Re-read when unknown or incomplete, so a slow load or a fresh admin
    // approval never locks a complete profile.
    if (!(completionFor(roleType)?.complete ?? false)) {
      try {
        await ProfileService().syncRoleAccount(roleType: roleType);
      } catch (_) {
        // Falls through to the prompt; the form surfaces the real error.
      }
      if (!context.mounted) return false;
    }

    final completion = completionFor(roleType);
    if (completion?.complete ?? false) return true;

    // Only awaiting admin approval: the form wouldn't help, so just say so.
    if (completion != null && completion.onlyAwaitingReview) {
      await _showUnderReviewDialog(context);
      return false;
    }

    final goToProfile = await _showProfileRequiredDialog(
      context,
      missing: completion?.actionable ?? const [],
      documentUnderReview: completion?.residencyUnderReview ?? false,
    );
    if (!goToProfile || !context.mounted) return false;

    final saved = await MobileProfileEditScreen.open(context, roleType);
    return saved?.completion.complete ?? false;
  }

  static Future<bool> _showProfileRequiredDialog(
    BuildContext context, {
    required List<String> missing,
    bool documentUnderReview = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.background,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        contentPadding: const EdgeInsets.fromLTRB(24, 28, 24, 8),
        actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.14),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_outline_rounded,
                color: AppColors.primary,
                size: 32,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Complete your profile first',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              [
                'This action unlocks once your profile is complete.',
                if (missing.isNotEmpty)
                  'Still missing: '
                      '${missing.map(ProfileCompletion.labelFor).join(', ')}.',
                if (documentUnderReview)
                  'Your proof of residency is also waiting for the '
                      'administrator\'s approval.',
              ].join(' '),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Complete Profile'),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Not now'),
            ),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  static Future<void> _showUnderReviewDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.background,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        contentPadding: const EdgeInsets.fromLTRB(24, 28, 24, 8),
        actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.14),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.hourglass_top_rounded,
                color: AppColors.primary,
                size: 32,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Document under review',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your proof of residency is waiting for the administrator\'s '
              'approval. Your profile will be complete — and this action '
              'unlocked — once it is approved.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('OK'),
            ),
          ),
        ],
      ),
    );
  }
}
