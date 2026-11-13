import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/shared/widgets/ground_card.dart';

/// What the beneficiary picked from [RequestActionDialog].
enum RequestAction { assistance, assessment }

/// The Request tab's single entry point: a white dialog offering the two
/// things a beneficiary can start — file an assistance request, or take (or
/// revisit) the Needs Assessment Survey. Returns the choice, or null when
/// dismissed; the caller opens the matching screen.
class RequestActionDialog extends StatelessWidget {
  const RequestActionDialog({super.key, required this.assessment});

  final NeedsAssessmentSummary assessment;

  static Future<RequestAction?> show(
    BuildContext context, {
    required NeedsAssessmentSummary assessment,
  }) {
    return showDialog<RequestAction>(
      context: context,
      builder: (_) => RequestActionDialog(assessment: assessment),
    );
  }

  @override
  Widget build(BuildContext context) {
    final onFile = assessment.state.hasSubmission;

    return Dialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            IconTileHeading(
              icon: Icons.add_task_rounded,
              title: 'What do you need?',
              body: 'Choose what you would like to do.',
              titleSize: 17,
              trailing: IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded),
                color: AppColors.primary,
                visualDensity: VisualDensity.compact,
                tooltip: 'Close',
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Column(
                children: [
                  _ActionOption(
                    icon: Icons.volunteer_activism_outlined,
                    title: 'Request Assistance',
                    body:
                        'File a new request for food, medical, financial or '
                        'other help.',
                    onTap: () =>
                        Navigator.of(context).pop(RequestAction.assistance),
                  ),
                  const SizedBox(height: 12),
                  _ActionOption(
                    icon: Icons.assignment_outlined,
                    title: onFile ? 'Needs Assessment' : 'Take Assessment',
                    body: onFile
                        ? 'Your survey is on file. View or update it.'
                        : 'Answer 5 short questions so CARES can match '
                              'you with the right programs.',
                    onTap: () =>
                        Navigator.of(context).pop(RequestAction.assessment),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One choice in the dialog — a soft tile with a tinted icon, a dark green
/// title over an ink line, and a chevron.
class _ActionOption extends StatelessWidget {
  const _ActionOption({
    required this.icon,
    required this.title,
    required this.body,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String body;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final shape = BorderRadius.circular(16);

    return Material(
      color: AppColors.softFieldFill,
      shape: RoundedRectangleBorder(
        borderRadius: shape,
        side: const BorderSide(color: AppColors.softFieldBorder),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: shape,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: AppDecorations.iconTile(),
                child: Icon(icon, size: 22, color: AppColors.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      body,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.35,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
            ],
          ),
        ),
      ),
    );
  }
}
