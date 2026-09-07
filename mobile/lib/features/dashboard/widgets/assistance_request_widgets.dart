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

/// Household needs assessment status card.
class NeedsAssessmentCard extends StatelessWidget {
  const NeedsAssessmentCard({super.key, required this.summary});

  final NeedsAssessmentSummary summary;

  @override
  Widget build(BuildContext context) {
    final color = needsAssessmentColor(summary.status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.assignment_ind_outlined,
                  size: 20,
                  color: color,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Needs Assessment',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              RequestStatusPill(label: summary.status.label, color: color),
            ],
          ),
          const SizedBox(height: 12),
          _AssessmentRow(
            icon: Icons.event_available_outlined,
            label: 'Last assessed',
            value: summary.assessedOnLabel,
          ),
          _AssessmentRow(
            icon: Icons.event_rounded,
            label: 'Next visit',
            value: summary.nextVisitLabel,
          ),
          _AssessmentRow(
            icon: Icons.flag_outlined,
            label: 'Priority level',
            value: summary.priorityLevel,
          ),
          _AssessmentRow(
            icon: Icons.badge_outlined,
            label: 'Assessed by',
            value: summary.assessor,
          ),
          const SizedBox(height: 4),
          Text(
            summary.note,
            style: const TextStyle(
              fontSize: 12.5,
              height: 1.45,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _AssessmentRow extends StatelessWidget {
  const _AssessmentRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textMuted,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
