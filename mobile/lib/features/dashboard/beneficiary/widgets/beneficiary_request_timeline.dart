import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/widgets/assistance_request_widgets.dart';
import 'package:mobile/shared/widgets/ground_card.dart';

/// Which filter chip a timeline entry falls under. Declined and cancelled
/// requests are [closed] and only show under "All".
enum TimelineStage { pending, approved, completed, closed }

/// One row on the beneficiary home timeline — an assistance request or the
/// needs assessment survey, flattened to what the row draws.
class _TimelineEntry {
  const _TimelineEntry({
    required this.title,
    required this.kind,
    required this.detail,
    required this.date,
    required this.stage,
    required this.statusLabel,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String kind;
  final String detail;
  final DateTime date;
  final TimelineStage stage;
  final String statusLabel;
  final Color color;
  final IconData icon;
  final VoidCallback? onTap;
}

/// Timeline of the beneficiary's assistance requests and needs assessment,
/// newest first, with All │ Pending │ Approved │ Completed chips. Shows
/// "No requests yet" when there is nothing on file.
class BeneficiaryRequestTimeline extends StatefulWidget {
  const BeneficiaryRequestTimeline({
    super.key,
    required this.requests,
    required this.assessment,
    required this.onOpenRequest,
    required this.onOpenAssessment,
    this.isLoading = false,
    this.limit = 6,
  });

  final List<AssistanceRequest> requests;
  final NeedsAssessmentSummary assessment;
  final ValueChanged<AssistanceRequest> onOpenRequest;
  final VoidCallback onOpenAssessment;
  final bool isLoading;

  /// Most rows drawn at once; the section's "See all" opens the rest.
  final int limit;

  @override
  State<BeneficiaryRequestTimeline> createState() =>
      _BeneficiaryRequestTimelineState();
}

class _BeneficiaryRequestTimelineState
    extends State<BeneficiaryRequestTimeline> {
  /// Null = "All".
  TimelineStage? _filter;

  static TimelineStage _stageOf(AssistanceRequestStatus status) =>
      switch (status) {
        AssistanceRequestStatus.pending ||
        AssistanceRequestStatus.underReview => TimelineStage.pending,
        AssistanceRequestStatus.approved => TimelineStage.approved,
        AssistanceRequestStatus.completed => TimelineStage.completed,
        AssistanceRequestStatus.declined ||
        AssistanceRequestStatus.cancelled => TimelineStage.closed,
      };

  List<_TimelineEntry> get _entries {
    final entries = <_TimelineEntry>[
      for (final r in widget.requests)
        _TimelineEntry(
          title: r.title,
          kind: 'Assistance',
          detail: r.referenceNumber,
          date: r.lastUpdatedOn ?? r.submittedOn,
          stage: _stageOf(r.status),
          statusLabel: r.status.label,
          color: assistanceStatusColor(r.status),
          icon: assistanceStatusIcon(r.status),
          onTap: () => widget.onOpenRequest(r),
        ),
    ];

    final a = widget.assessment;
    if (a.state.hasSubmission && a.submittedOn != null) {
      final needsUpdate = a.state == BeneficiaryAssessmentState.needsUpdate;
      entries.add(
        _TimelineEntry(
          title: 'Needs Assessment Survey',
          kind: 'Assessment',
          detail: needsUpdate ? 'Update requested' : 'Survey submitted',
          date: a.submittedOn!,
          stage: needsUpdate ? TimelineStage.pending : TimelineStage.completed,
          statusLabel: needsUpdate ? 'Pending' : 'Completed',
          color: needsUpdate ? AppColors.accentOrange : AppColors.primaryDark,
          icon: needsUpdate
              ? Icons.hourglass_top_rounded
              : Icons.task_alt_rounded,
          onTap: widget.onOpenAssessment,
        ),
      );
    }

    entries.sort((x, y) => y.date.compareTo(x.date));
    return entries;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) return const _TimelineSkeleton();

    final all = _entries;
    int count(TimelineStage s) => all.where((e) => e.stage == s).length;
    final shown = all
        .where((e) => _filter == null || e.stage == _filter)
        .take(widget.limit)
        .toList();

    return GroundCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  count: all.length,
                  selected: _filter == null,
                  onTap: () => setState(() => _filter = null),
                ),
                for (final (stage, label) in const [
                  (TimelineStage.pending, 'Pending'),
                  (TimelineStage.approved, 'Approved'),
                  (TimelineStage.completed, 'Completed'),
                ])
                  _FilterChip(
                    label: label,
                    count: count(stage),
                    selected: _filter == stage,
                    onTap: () => setState(() => _filter = stage),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (shown.isEmpty)
            _TimelineEmpty(filter: _filter, hasAny: all.isNotEmpty)
          else
            for (var i = 0; i < shown.length; i++)
              _TimelineRow(entry: shown[i], isLast: i == shown.length - 1),
        ],
      ),
    );
  }
}

/// White outlined pill; selected = `primaryDark` fill.
class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : AppColors.primaryDark;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: selected ? AppColors.primaryDark : Colors.white,
        shape: StadiumBorder(
          side: BorderSide(
            color: selected ? AppColors.primaryDark : AppColors.softFieldBorder,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          customBorder: const StadiumBorder(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            child: Text(
              '$label  $count',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: fg,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Status dot on the rail, a connector down to the next entry, and the
/// entry's title, kind, reference, date and status pill.
class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.entry, required this.isLast});

  final _TimelineEntry entry;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final e = entry;
    return InkWell(
      onTap: e.onTap,
      borderRadius: BorderRadius.circular(12),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 34,
              child: Column(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: e.color.withValues(alpha: 0.12),
                      border: Border.all(
                        color: e.color.withValues(alpha: 0.35),
                        width: 1.4,
                      ),
                    ),
                    child: Icon(e.icon, size: 17, color: e.color),
                  ),
                  if (!isLast)
                    Expanded(
                      child: Container(
                        width: 2,
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.softFieldBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(top: 2, bottom: isLast ? 10 : 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            e.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                              height: 1.25,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        RequestStatusPill(
                          label: e.statusLabel,
                          color: e.color,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${e.kind} · ${e.detail}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(
                          Icons.schedule_rounded,
                          size: 13,
                          color: AppColors.inkMuted,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          formatRequestDate(e.date),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.inkMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineEmpty extends StatelessWidget {
  const _TimelineEmpty({required this.filter, required this.hasAny});

  final TimelineStage? filter;
  final bool hasAny;

  @override
  Widget build(BuildContext context) {
    final title = !hasAny || filter == null
        ? 'No requests yet'
        : switch (filter!) {
            TimelineStage.pending => 'No pending requests',
            TimelineStage.approved => 'No approved requests',
            TimelineStage.completed => 'No completed requests',
            TimelineStage.closed => 'No closed requests',
          };
    final body = hasAny
        ? 'Requests with this status will show up here.'
        : 'Your assistance requests and needs assessment will appear '
              'here as they move from pending to completed.';

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 10, 8, 18),
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.softFieldFill,
            ),
            child: const Icon(
              Icons.timeline_rounded,
              size: 26,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.35,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineSkeleton extends StatelessWidget {
  const _TimelineSkeleton();

  @override
  Widget build(BuildContext context) {
    return GroundCard(
      padding: const EdgeInsets.all(16),
      child: SkeletonLoader(
        child: Column(
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: EdgeInsets.only(bottom: i == 2 ? 0 : 18),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(
                      width: 34,
                      height: 34,
                      shape: BoxShape.circle,
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBox(width: 170, height: 14),
                          SizedBox(height: 8),
                          SkeletonBox(width: 120, height: 11),
                        ],
                      ),
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
