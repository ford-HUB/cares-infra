import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/id_image_pre_validator.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';

/// Explains why a photo of one side of an ID was rejected and how to retake
/// it. [onUseAnyway] is offered only when every issue is overridable.
class IdImageCheckBanner extends StatelessWidget {
  const IdImageCheckBanner({super.key, required this.result, this.onUseAnyway});

  final IdImageCheckResult result;
  final VoidCallback? onUseAnyway;

  String _titleFor(IdImageIssue issue) {
    if (issue != IdImageIssue.missingIdDetails ||
        result.missingFields.isEmpty) {
      return issue.title;
    }
    final fields = result.missingFields.join(' and ');
    return 'We couldn\'t read your $fields';
  }

  String _tipFor(IdImageIssue issue) {
    if (issue == IdImageIssue.missingIdDetails &&
        result.side == IdCardSide.back) {
      return 'Retake whichever side shows it — straight on, in focus, with '
          'every edge of the card visible.';
    }
    return issue.tip;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.error_outline_rounded,
                color: AppColors.error,
                size: 22,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'The ${result.side.label} photo didn\'t pass the check',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.error,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 30),
            child: Text(
              'Please retake it before continuing.',
              style: TextStyle(
                fontSize: 12.5,
                color: AppColors.primaryDark.withValues(alpha: 0.8),
              ),
            ),
          ),
          for (final issue in result.issues) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.only(left: 30),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _titleFor(issue),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _tipFor(issue),
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.35,
                      color: AppColors.primaryDark.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (onUseAnyway != null) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onUseAnyway,
                style: TextButton.styleFrom(foregroundColor: AppColors.primary),
                child: const Text('Use this photo anyway'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
