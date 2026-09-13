import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../domain/cares_event.dart';

/// Summary panel shown on a completed event: event details plus the
/// participation, feedback, and certificate statuses of the volunteer.
class CompletedEventStatusCard extends StatelessWidget {
  const CompletedEventStatusCard({
    super.key,
    required this.event,
    required this.participated,
    required this.feedbackSubmitted,
  });

  final CaresEvent event;
  final bool participated;
  final bool feedbackSubmitted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.task_alt_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Event summary',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          CompletedEventStatusRow(
            icon: Icons.event_note_rounded,
            label: 'Event name',
            value: event.title,
          ),
          CompletedEventStatusRow(
            icon: Icons.calendar_today_rounded,
            label: 'Event date',
            value: '${event.longDateLabel} · ${event.time}',
          ),
          CompletedEventStatusRow(
            icon: Icons.flag_rounded,
            label: 'Event status',
            value: 'Completed',
            valueColor: AppColors.primary,
          ),
          CompletedEventStatusRow(
            icon: Icons.how_to_reg_rounded,
            label: 'Your participation',
            value: participated
                ? 'Participated · Attendance verified'
                : 'Not recorded',
            valueColor: participated ? AppColors.primary : AppColors.textMuted,
          ),
          CompletedEventStatusRow(
            icon: feedbackSubmitted
                ? Icons.rate_review_rounded
                : Icons.rate_review_outlined,
            label: 'Feedback',
            value: feedbackSubmitted ? 'Submitted' : 'Not Submitted',
            valueColor: feedbackSubmitted
                ? AppColors.primary
                : AppColors.accentOrange,
          ),
          CompletedEventStatusRow(
            icon: feedbackSubmitted
                ? Icons.workspace_premium_rounded
                : Icons.lock_rounded,
            label: 'Certificate',
            value: feedbackSubmitted
                ? 'Available — Get Certificate'
                : 'Locked — Complete Feedback First',
            valueColor: feedbackSubmitted
                ? AppColors.primary
                : AppColors.accentOrange,
          ),
        ],
      ),
    );
  }
}

class CompletedEventStatusRow extends StatelessWidget {
  const CompletedEventStatusRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: valueColor ?? AppColors.textPrimary,
                    height: 1.35,
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

/// Callout that explains the locked/unlocked certificate state.
class CertificateStatusBanner extends StatelessWidget {
  const CertificateStatusBanner({super.key, required this.unlocked});

  final bool unlocked;

  @override
  Widget build(BuildContext context) {
    final color = unlocked ? AppColors.primary : AppColors.accentOrange;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            unlocked ? Icons.lock_open_rounded : Icons.lock_rounded,
            size: 20,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  unlocked
                      ? 'Certificate unlocked'
                      : 'Certificate locked — Complete Feedback First',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  unlocked
                      ? 'Thank you for your feedback. Your certificate of '
                            'participation is ready to view and download.'
                      : 'Share your feedback about this event to unlock your '
                            'certificate of participation.',
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: AppColors.textSecondary,
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

/// Compact list entry for a completed event: shows the feedback and
/// certificate status and routes into the post-event flow.
class CompletedEventCard extends StatelessWidget {
  const CompletedEventCard({
    super.key,
    required this.event,
    required this.feedbackSubmitted,
    required this.onTap,
  });

  final CaresEvent event;
  final bool feedbackSubmitted;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = feedbackSubmitted
        ? AppColors.primary
        : AppColors.accentOrange;

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
                      width: 52,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          Text(
                            event.dayLabel,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                              height: 1,
                            ),
                          ),
                          Text(
                            event.monthLabel,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            event.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            event.organization,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      decoration: AppDecorations.softBadge(
                        fill: AppColors.primary.withValues(alpha: 0.1),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.task_alt_rounded,
                            size: 14,
                            color: AppColors.primary,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Completed',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: accent.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        feedbackSubmitted
                            ? Icons.workspace_premium_rounded
                            : Icons.lock_rounded,
                        size: 18,
                        color: accent,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              feedbackSubmitted
                                  ? 'Feedback: Submitted'
                                  : 'Feedback: Not Submitted',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: accent,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              feedbackSubmitted
                                  ? 'Certificate available'
                                  : 'Certificate locked',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        feedbackSubmitted
                            ? 'View Certificate'
                            : 'Give Feedback',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: accent,
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: accent,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
