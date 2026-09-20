import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/domain/mock_activity.dart';
import 'package:mobile/features/dashboard/screens/assistance_request_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/assistance_request_widgets.dart';

/// Beneficiary activity tab — one feed of assistance requests and event
/// participation, newest first, with a summary row and a type filter.
class BeneficiaryActivityTab extends StatefulWidget {
  const BeneficiaryActivityTab({super.key, this.onViewRequests});

  final VoidCallback? onViewRequests;

  @override
  State<BeneficiaryActivityTab> createState() => _BeneficiaryActivityTabState();
}

enum _ActivityFilter { all, requests, events }

class _BeneficiaryActivityTabState extends State<BeneficiaryActivityTab> {
  final _store = AssistanceRequestStore.instance;

  _ActivityFilter _filter = _ActivityFilter.all;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  List<_FeedItem> get _feed {
    final items = <_FeedItem>[
      if (_filter != _ActivityFilter.events)
        for (final request in _store.history) _FeedItem.request(request),
      if (_filter != _ActivityFilter.requests)
        for (final entry in MockActivities.entries)
          if (entry.status != ActivityStatus.cancelled) _FeedItem.event(entry),
    ];
    items.sort((a, b) => b.date.compareTo(a.date));
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final requests = _store.history;
    final approved =
        _store.approvedRequests.length + _store.completedRequests.length;
    final eventsJoined = MockActivities.entries
        .where((e) => e.status != ActivityStatus.cancelled)
        .length;
    final feed = _feed;

    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Activity',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your assistance requests and event participation',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _SummaryChip(
                          icon: Icons.request_page_outlined,
                          color: AppColors.accentOrange,
                          value: '${requests.length}',
                          label: 'Requests',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SummaryChip(
                          icon: Icons.verified_outlined,
                          color: AppColors.primary,
                          value: '$approved',
                          label: 'Approved',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SummaryChip(
                          icon: Icons.event_available_outlined,
                          color: const Color(0xFF1976D2),
                          value: '$eventsJoined',
                          label: 'Events joined',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      for (final filter in _ActivityFilter.values) ...[
                        _FilterChip(
                          label: switch (filter) {
                            _ActivityFilter.all => 'All',
                            _ActivityFilter.requests => 'Requests',
                            _ActivityFilter.events => 'Events',
                          },
                          selected: _filter == filter,
                          onTap: () => setState(() => _filter = filter),
                        ),
                        if (filter != _ActivityFilter.values.last)
                          const SizedBox(width: 8),
                      ],
                      const Spacer(),
                      if (widget.onViewRequests != null &&
                          _filter != _ActivityFilter.events)
                        TextButton(
                          onPressed: widget.onViewRequests,
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text(
                            'All requests',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (feed.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 48, 20, 48),
                child: Center(
                  child: Text(
                    'No activity yet.',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              sliver: SliverList.separated(
                itemCount: feed.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = feed[index];
                  return _FeedCard(
                    item: item,
                    onTap: item.request == null
                        ? null
                        : () => AssistanceRequestDetailsScreen.open(
                            context,
                            item.request!,
                          ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

/// One row of the merged feed — either an assistance request or an event.
class _FeedItem {
  const _FeedItem._({
    required this.date,
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.statusLabel,
    required this.statusColor,
    required this.typeLabel,
    this.request,
  });

  factory _FeedItem.request(AssistanceRequest request) {
    final color = assistanceStatusColor(request.status);
    return _FeedItem._(
      date: request.lastUpdatedOn ?? request.submittedOn,
      icon: assistanceStatusIcon(request.status),
      color: color,
      title: request.title,
      subtitle: '${request.referenceNumber} · ${request.category}',
      statusLabel: request.status.label,
      statusColor: color,
      typeLabel: 'Assistance request',
      request: request,
    );
  }

  factory _FeedItem.event(MockActivityEntry entry) {
    final statusColor = switch (entry.status) {
      ActivityStatus.completed => AppColors.primary,
      ActivityStatus.registered => const Color(0xFF1976D2),
      ActivityStatus.cancelled => AppColors.heart,
    };
    return _FeedItem._(
      date: DateTime.tryParse(entry.date) ?? DateTime(2000),
      icon: Icons.event_outlined,
      color: eventCategoryColor(entry.category),
      title: entry.eventTitle,
      subtitle: '${entry.category} · ${entry.location}',
      statusLabel: entry.status.label,
      statusColor: statusColor,
      typeLabel: 'Event',
    );
  }

  final DateTime date;
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String statusLabel;
  final Color statusColor;
  final String typeLabel;
  final AssistanceRequest? request;
}

class _FeedCard extends StatelessWidget {
  const _FeedCard({required this.item, this.onTap});

  final _FeedItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: item.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item.icon, color: item.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        RequestStatusPill(
                          label: item.statusLabel,
                          color: item.statusColor,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          item.request == null
                              ? Icons.event_available_outlined
                              : Icons.update_rounded,
                          size: 13,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          formatRequestDate(item.date),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            item.typeLabel,
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                        const Spacer(),
                        if (onTap != null)
                          const Icon(
                            Icons.chevron_right_rounded,
                            size: 18,
                            color: AppColors.textMuted,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.fieldBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}
