import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/assistance_request_data.dart';
import '../widgets/assistance_request_widgets.dart';

/// Full details of one assistance request: status, progress trail, needs
/// assessment, and what was requested.
class AssistanceRequestDetailsScreen extends StatelessWidget {
  const AssistanceRequestDetailsScreen({super.key, required this.request});

  final AssistanceRequest request;

  static void open(BuildContext context, AssistanceRequest request) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AssistanceRequestDetailsScreen(request: request),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = assistanceStatusColor(request.status);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Request Details'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        request.title,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1.25,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    RequestStatusPill.status(request.status),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  request.referenceNumber,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                if (request.statusNote != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: statusColor.withValues(alpha: 0.22),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          assistanceStatusIcon(request.status),
                          size: 18,
                          color: statusColor,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            request.statusNote!,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.45,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Request information'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              children: [
                _DetailRow(
                  icon: Icons.category_outlined,
                  label: 'Category',
                  value: request.category,
                ),
                _DetailRow(
                  icon: Icons.priority_high_rounded,
                  label: 'Urgency',
                  value: request.urgency,
                ),
                _DetailRow(
                  icon: Icons.groups_outlined,
                  label: 'Household size',
                  value: '${request.householdSize} members',
                ),
                _DetailRow(
                  icon: Icons.calendar_today_rounded,
                  label: 'Date submitted',
                  value: request.submittedOnLabel,
                ),
                _DetailRow(
                  icon: Icons.update_rounded,
                  label: 'Last updated',
                  value: request.lastUpdatedLabel,
                ),
                _DetailRow(
                  icon: Icons.apartment_rounded,
                  label: 'Handled by',
                  value: request.assignedOrganization,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Needs assessment'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.surfaceCard(),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: needsAssessmentColor(
                      request.needsAssessment,
                    ).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.assignment_ind_outlined,
                    size: 20,
                    color: needsAssessmentColor(request.needsAssessment),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Status: ${request.needsAssessment.label}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: needsAssessmentColor(request.needsAssessment),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Assessment date: ${request.assessmentDateLabel}',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Description'),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.surfaceCard(),
            child: Text(
              request.description,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          if (request.items.isNotEmpty) ...[
            const SizedBox(height: 20),
            const _SectionTitle('Requested items'),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: AppDecorations.surfaceCard(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: request.items
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 16,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item,
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
          const SizedBox(height: 20),
          const _SectionTitle('Request progress'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              children: List.generate(request.timeline.length, (index) {
                return _TimelineTile(
                  entry: request.timeline[index],
                  isLast: index == request.timeline.length - 1,
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
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
      padding: const EdgeInsets.only(bottom: 12),
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
                fontSize: 13,
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

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.entry, required this.isLast});

  final RequestTimelineEntry entry;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = entry.done ? AppColors.primary : AppColors.textMuted;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: entry.done
                      ? AppColors.primary.withValues(alpha: 0.15)
                      : AppColors.inputFill.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.5)),
                ),
                child: Icon(
                  entry.done
                      ? Icons.check_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 13,
                  color: color,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: AppColors.borderLight,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: entry.done
                          ? AppColors.textPrimary
                          : AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.date == null
                        ? 'Pending'
                        : formatRequestDate(entry.date!),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                  if (entry.note != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      entry.note!,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
