import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/assistance_request_data.dart';

/// Palette for a request status, shared by the list, details, and pills.
Color assistanceStatusColor(AssistanceRequestStatus status) => switch (status) {
  AssistanceRequestStatus.pending => AppColors.accentOrange,
  AssistanceRequestStatus.underReview => const Color(0xFF1976D2),
  AssistanceRequestStatus.approved => AppColors.primary,
  AssistanceRequestStatus.completed => AppColors.primaryDark,
  AssistanceRequestStatus.declined => AppColors.heart,
};

IconData assistanceStatusIcon(AssistanceRequestStatus status) =>
    switch (status) {
      AssistanceRequestStatus.pending => Icons.hourglass_top_rounded,
      AssistanceRequestStatus.underReview => Icons.fact_check_outlined,
      AssistanceRequestStatus.approved => Icons.verified_rounded,
      AssistanceRequestStatus.completed => Icons.task_alt_rounded,
      AssistanceRequestStatus.declined => Icons.cancel_outlined,
    };

Color needsAssessmentColor(NeedsAssessmentStatus status) => switch (status) {
  NeedsAssessmentStatus.notStarted => AppColors.textMuted,
  NeedsAssessmentStatus.scheduled => const Color(0xFF1976D2),
  NeedsAssessmentStatus.inProgress => AppColors.accentOrange,
  NeedsAssessmentStatus.completed => AppColors.primary,
};

/// Small colored status pill, e.g. "Pending" or "Approved".
class RequestStatusPill extends StatelessWidget {
  const RequestStatusPill({
    super.key,
    required this.label,
    required this.color,
    this.icon,
  }) : _status = null;

  const RequestStatusPill.status(AssistanceRequestStatus status, {super.key})
    : label = '',
      color = Colors.transparent,
      icon = null,
      _status = status;

  final String label;
  final Color color;
  final IconData? icon;
  final AssistanceRequestStatus? _status;

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final resolvedLabel = status == null ? label : status.label;
    final resolvedColor = status == null
        ? color
        : assistanceStatusColor(status);
    final resolvedIcon = status == null ? icon : assistanceStatusIcon(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: resolvedColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        border: Border.all(color: resolvedColor.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (resolvedIcon != null) ...[
            Icon(resolvedIcon, size: 14, color: resolvedColor),
            const SizedBox(width: 5),
          ],
          Text(
            resolvedLabel,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: resolvedColor,
            ),
          ),
        ],
      ),
    );
  }
}

/// List entry for one assistance request.
class AssistanceRequestCard extends StatelessWidget {
  const AssistanceRequestCard({
    super.key,
    required this.request,
    required this.onTap,
  });

  final AssistanceRequest request;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = assistanceStatusColor(request.status);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          child: Ink(
            padding: const EdgeInsets.all(14),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        assistanceStatusIcon(request.status),
                        size: 20,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            request.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${request.category} · ${request.referenceNumber}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    RequestStatusPill.status(request.status),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_rounded,
                      size: 14,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Submitted ${request.submittedOnLabel}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                    Text(
                      'Assessment: ${request.needsAssessment.label}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: needsAssessmentColor(request.needsAssessment),
                      ),
                    ),
                  ],
                ),
                if (request.statusNote != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      request.statusNote!,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      'View details',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: statusColor,
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: statusColor,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Palette for the beneficiary's own survey state.
Color beneficiaryAssessmentColor(BeneficiaryAssessmentState state) =>
    switch (state) {
      BeneficiaryAssessmentState.notCompleted => AppColors.accentOrange,
      BeneficiaryAssessmentState.completed => AppColors.primary,
      BeneficiaryAssessmentState.needsUpdate => const Color(0xFF1976D2),
    };

IconData beneficiaryAssessmentIcon(BeneficiaryAssessmentState state) =>
    switch (state) {
      BeneficiaryAssessmentState.notCompleted => Icons.radio_button_unchecked,
      BeneficiaryAssessmentState.completed => Icons.check_circle_rounded,
      BeneficiaryAssessmentState.needsUpdate => Icons.update_rounded,
    };

/// Needs Assessment Survey card — explains the survey's purpose, shows the
/// beneficiary's current state, and offers the matching action:
///
/// * not completed → **Take Assessment**
/// * completed → **View Assessment** (+ **Update** when a revision is allowed)
/// * needs update → **View Assessment** + **Update**
class NeedsAssessmentCard extends StatelessWidget {
  const NeedsAssessmentCard({
    super.key,
    required this.summary,
    this.onTakeAssessment,
    this.onViewAssessment,
    this.onUpdateAssessment,
  });

  final NeedsAssessmentSummary summary;
  final VoidCallback? onTakeAssessment;
  final VoidCallback? onViewAssessment;
  final VoidCallback? onUpdateAssessment;

  @override
  Widget build(BuildContext context) {
    final state = summary.state;
    final statusColor = beneficiaryAssessmentColor(state);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.assignment_outlined,
                  size: 22,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Needs Assessment Survey',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Tell us what your household and community need.',
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _AssessmentStatusStrip(
            icon: beneficiaryAssessmentIcon(state),
            label: state.label,
            detail: state.hasSubmission
                ? 'Submitted ${summary.submittedOnLabel}'
                : null,
            color: statusColor,
          ),
          const SizedBox(height: 14),
          if (!state.hasSubmission)
            _AssessmentActionButton(
              label: 'Take Assessment',
              onPressed: onTakeAssessment,
            )
          else
            Row(
              children: [
                Expanded(
                  child: _AssessmentActionButton(
                    label: 'View Assessment',
                    onPressed: onViewAssessment,
                  ),
                ),
                if (summary.canUpdate) ...[
                  const SizedBox(width: 10),
                  _AssessmentActionButton.outlined(
                    label: 'Update',
                    onPressed: onUpdateAssessment,
                  ),
                ],
              ],
            ),
        ],
      ),
    );
  }
}

/// Tinted status line inside the assessment card.
class _AssessmentStatusStrip extends StatelessWidget {
  const _AssessmentStatusStrip({
    required this.icon,
    required this.label,
    required this.color,
    this.detail,
  });

  final IconData icon;
  final String label;
  final String? detail;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ),
          if (detail != null)
            Text(
              detail!,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
              ),
            ),
        ],
      ),
    );
  }
}

/// Filled "Label →" button, or a compact outlined variant for secondary
/// actions such as "Update".
class _AssessmentActionButton extends StatelessWidget {
  const _AssessmentActionButton({required this.label, this.onPressed})
    : _outlined = false;

  const _AssessmentActionButton.outlined({required this.label, this.onPressed})
    : _outlined = true;

  final String label;
  final VoidCallback? onPressed;
  final bool _outlined;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    );
    const padding = EdgeInsets.symmetric(horizontal: 16, vertical: 12);

    if (_outlined) {
      return OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryDark,
          side: const BorderSide(color: AppColors.primaryDark, width: 1.2),
          shape: shape,
          padding: padding,
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
        ),
      );
    }

    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primaryDark,
        foregroundColor: Colors.white,
        shape: shape,
        padding: padding,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(width: 6),
          const Icon(Icons.arrow_forward_rounded, size: 18),
        ],
      ),
    );
  }
}
