import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/id_image_pre_validator.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';

enum IdUnclearChoice {
  retake,

  /// Details read off it stay open for correction.
  proceed,

  /// No ID check or face scan; a director approves the account.
  manual,
}

/// Modal so the notice can't be scrolled past; dismissing means
/// [IdUnclearChoice.retake].
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

  static const _buttonSize = Size.fromHeight(48);
  static const _buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(12)),
  );
  static const _buttonText = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w700,
  );

  String _titleFor(IdImageIssue issue) {
    if (issue != IdImageIssue.missingIdDetails ||
        result.missingFields.isEmpty) {
      return issue.title;
    }
    return 'We couldn\'t read your ${result.missingFields.join(' and ')}';
  }

  void _pick(BuildContext context, IdUnclearChoice choice) =>
      Navigator.of(context).pop(choice);

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 26, 22, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.accentOrange.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.report_gmailerrorred_rounded,
                color: AppColors.accentOrange,
                size: 30,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Your ID isn\'t clear',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'We couldn\'t read the ${result.side.label} of your ID clearly.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.4,
                color: AppColors.inkMuted,
              ),
            ),
            if (result.issues.isNotEmpty) ...[
              const SizedBox(height: 14),
              _IssueList(issues: [for (final i in result.issues) _titleFor(i)]),
            ],
            const SizedBox(height: 20),
            FilledButton(
              key: const ValueKey('id-unclear-retake'),
              onPressed: () => _pick(context, IdUnclearChoice.retake),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: _buttonSize,
                shape: _buttonShape,
                textStyle: _buttonText,
              ),
              child: const Text('Retake Photo'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              key: const ValueKey('id-unclear-proceed'),
              onPressed: () => _pick(context, IdUnclearChoice.proceed),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary, width: 1.2),
                minimumSize: _buttonSize,
                shape: _buttonShape,
                textStyle: _buttonText,
              ),
              child: const Text('Continue Anyway'),
            ),
            if (offersManualRegistration) ...[
              const SizedBox(height: 4),
              TextButton(
                key: const ValueKey('id-unclear-manual'),
                onPressed: () => _pick(context, IdUnclearChoice.manual),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  minimumSize: _buttonSize,
                  shape: _buttonShape,
                  textStyle: _buttonText.copyWith(fontWeight: FontWeight.w600),
                ),
                child: const Text('Register Manually'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _IssueList extends StatelessWidget {
  const _IssueList({required this.issues});

  final List<String> issues;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.accentOrange.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (index, issue) in issues.indexed)
            Padding(
              padding: EdgeInsets.only(top: index == 0 ? 0 : 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 1),
                    child: Icon(
                      Icons.error_outline_rounded,
                      size: 16,
                      color: AppColors.accentOrange,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      issue,
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.3,
                        fontWeight: FontWeight.w600,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
