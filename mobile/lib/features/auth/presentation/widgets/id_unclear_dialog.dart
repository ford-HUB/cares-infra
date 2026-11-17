import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/id_image_pre_validator.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';

/// What the registrant picked in [showIdUnclearDialog].
enum IdUnclearChoice {
  /// Take or pick another photo of this side.
  retake,

  /// Keep this photo and continue the standard sign-up; the details read off
  /// it are then open for correction.
  proceed,

  /// Switch to manual registration: no automatic ID check, no face scan, the
  /// details are typed in, and a director approves the account.
  manual,
}

/// Pops up as soon as the photo check says an ID side is blurry, unclear or
/// read with low accuracy, so the notice can't be scrolled past. Returns
/// [IdUnclearChoice.retake] when dismissed.
Future<IdUnclearChoice> showIdUnclearDialog(
  BuildContext context, {
  required IdImageCheckResult result,
  required bool offersManualRegistration,
}) async {
  final choice = await showDialog<IdUnclearChoice>(
    context: context,
    builder: (_) => _IdUnclearDialog(
      result: result,
      offersManualRegistration: offersManualRegistration,
    ),
  );
  return choice ?? IdUnclearChoice.retake;
}

class _IdUnclearDialog extends StatelessWidget {
  const _IdUnclearDialog({
    required this.result,
    required this.offersManualRegistration,
  });

  final IdImageCheckResult result;
  final bool offersManualRegistration;

  String _titleFor(IdImageIssue issue) {
    if (issue != IdImageIssue.missingIdDetails ||
        result.missingFields.isEmpty) {
      return issue.title;
    }
    return 'We couldn\'t read your ${result.missingFields.join(' and ')}';
  }

  @override
  Widget build(BuildContext context) {
    final muted = AppColors.primaryDark.withValues(alpha: 0.8);

    return AlertDialog(
      icon: const Icon(
        Icons.report_gmailerrorred_rounded,
        color: AppColors.accentOrange,
        size: 34,
      ),
      title: const Text(
        'Your ID isn\'t clear',
        textAlign: TextAlign.center,
        style: TextStyle(fontWeight: FontWeight.w800),
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'The system detected that the ${result.side.label} of your ID '
              'is not clear, so its details may not be read accurately:',
              style: TextStyle(fontSize: 13.5, height: 1.4, color: muted),
            ),
            const SizedBox(height: 10),
            for (final issue in result.issues)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '•  ${_titleFor(issue)}',
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
            const SizedBox(height: 10),
            Text(
              offersManualRegistration
                  ? 'Retake the photo, continue with it and correct any '
                        'details it misreads, or register manually — you type '
                        'your details in and a CARES director approves your '
                        'account.'
                  : 'Retake the photo, or continue with it and correct any '
                        'details it misreads.',
              style: TextStyle(fontSize: 12.5, height: 1.4, color: muted),
            ),
          ],
        ),
      ),
      actionsAlignment: MainAxisAlignment.center,
      actionsOverflowButtonSpacing: 4,
      actions: [
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            key: const ValueKey('id-unclear-retake'),
            onPressed: () => Navigator.of(context).pop(IdUnclearChoice.retake),
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Retake Photo'),
          ),
        ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            key: const ValueKey('id-unclear-proceed'),
            onPressed: () => Navigator.of(context).pop(IdUnclearChoice.proceed),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
            ),
            child: const Text('Continue Anyway'),
          ),
        ),
        if (offersManualRegistration)
          SizedBox(
            width: double.infinity,
            child: TextButton(
              key: const ValueKey('id-unclear-manual'),
              onPressed: () =>
                  Navigator.of(context).pop(IdUnclearChoice.manual),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              child: const Text('Proceed to Manual Registration'),
            ),
          ),
      ],
    );
  }
}
