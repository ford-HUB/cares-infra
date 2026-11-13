import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/donor/data/donor_accent_colors.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/presentation/widgets/donor_summary_chips.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_tab_states.dart';
import 'package:mobile/features/dashboard/screens/donation_flow_screen.dart';
import 'package:mobile/features/dashboard/widgets/activity_tab_widgets.dart';

/// The donor's donation tracking — every money and goods donation they made,
/// from `GET /donations/me`, with where each one stands on its ladder. The
/// header's Confirmed / Donations / Drives chips filter the list. A tap on a
/// card opens the status view; the Director's moves on the portal show up
/// here on the next fetch.
class DonorActivityTab extends ConsumerStatefulWidget {
  const DonorActivityTab({super.key});

  @override
  ConsumerState<DonorActivityTab> createState() => _DonorActivityTabState();
}

class _DonorActivityTabState extends ConsumerState<DonorActivityTab> {
  DonorActivityView _view = DonorActivityView.donations;

  @override
  Widget build(BuildContext context) {
    final donations = ref.watch(myDonationsProvider);
    final summary = DonorSummary.of(donations.asData?.value ?? const []);

    return ColoredBox(
      color: AppColors.background,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: DeepTabHeader(
              title: 'Activity',
              bottom: DonorSummaryRow(
                summary: summary,
                selected: _view,
                onSelected: (view) => setState(() => _view = view),
              ),
            ),
          ),
          ...donations.when(
            loading: () => const [
              SliverPadding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 24),
                sliver: SliverToBoxAdapter(child: _ActivitySkeleton()),
              ),
            ],
            error: (error, _) => [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                sliver: SliverToBoxAdapter(
                  child: HomeStateCard.error(
                    message: error is ApiException
                        ? error.message
                        : 'Could not load your donations right now.',
                    onRetry: () => ref.invalidate(myDonationsProvider),
                  ),
                ),
              ),
            ],
            data: (items) {
              final rows = _rowsFor(items);
              if (rows.isEmpty) {
                return [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EmptyActivityState(view: _view),
                  ),
                ];
              }
              return [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  sliver: SliverList.list(children: rows),
                ),
              ];
            },
          ),
        ],
      ),
    );
  }

  /// The list under the header for the selected chip: cards with 12pt gaps,
  /// and on Drives a heading above each drive's donations.
  List<Widget> _rowsFor(List<Donation> items) {
    Widget card(Donation d) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: _DonationActivityCard(donation: d),
    );

    switch (_view) {
      case DonorActivityView.donations:
        return [for (final d in items) card(d)];
      case DonorActivityView.confirmed:
        return [for (final d in items.where((d) => d.isComplete)) card(d)];
      case DonorActivityView.drives:
        // Same drives the chip counts: cancelled / declined are left out.
        final byDrive = <int, List<Donation>>{};
        for (final d in items.where((d) => !d.isCancelled && !d.isDeclined)) {
          byDrive.putIfAbsent(d.eventId, () => []).add(d);
        }
        return [
          for (final group in byDrive.values) ...[
            _DriveHeading(
              title: group.first.eventTitle,
              count: group.length,
              confirmed: group
                  .where((d) => d.isComplete)
                  .fold(0, (sum, d) => sum + d.amount),
            ),
            for (final d in group) card(d),
            const SizedBox(height: 8),
          ],
        ];
    }
  }
}

/// Heading above one drive's donations on the Drives view.
class _DriveHeading extends StatelessWidget {
  const _DriveHeading({
    required this.title,
    required this.count,
    required this.confirmed,
  });

  final String title;
  final int count;
  final int confirmed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 10),
      child: Row(
        children: [
          const Icon(
            Icons.campaign_outlined,
            size: 18,
            color: AppColors.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.ink,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            confirmed > 0
                ? '${DonationFormat.peso(confirmed)} · $count'
                : '$count donation${count == 1 ? '' : 's'}',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _DonationActivityCard extends StatelessWidget {
  const _DonationActivityCard({required this.donation});

  final Donation donation;

  Color get _statusColor => switch (donation.status) {
    DonationStatus.confirmed => AppColors.primary,
    DonationStatus.cancelled || DonationStatus.declined => AppColors.error,
    _ => AppColors.accentOrange,
  };

  @override
  Widget build(BuildContext context) {
    final isMoney = donation.isMoney;
    final typeColor = isMoney ? DonorAccents.money : DonorAccents.goods;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => DonationFlowScreen.openStatus(context, donation: donation),
        borderRadius: BorderRadius.circular(14),
        child: Ink(
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
                  color: typeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isMoney ? Icons.favorite_rounded : Icons.inventory_2_rounded,
                  color: typeColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            donation.eventTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: typeColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isMoney
                                ? DonationFormat.pesoFull(donation.amount)
                                : 'Goods',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: typeColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (!isMoney) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${donation.goodsLabel} × ${donation.goodsQuantity ?? 1}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          donation.reference,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: _statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          donation.statusLabel,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _statusColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 13,
                          color: DonorAccents.date,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          DonationFormat.dateOnly(donation.createdAt),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
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

class _ActivitySkeleton extends StatelessWidget {
  const _ActivitySkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Column(
        children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i < 2 ? 12 : 0),
              child: const SkeletonBox(height: 96, radius: 14),
            ),
        ],
      ),
    );
  }
}

class _EmptyActivityState extends StatelessWidget {
  const _EmptyActivityState({required this.view});

  final DonorActivityView view;

  @override
  Widget build(BuildContext context) {
    final (title, message) = switch (view) {
      DonorActivityView.confirmed => (
        'No confirmed donations yet',
        'A donation shows here once a director confirms it.',
      ),
      DonorActivityView.drives => (
        'No drives supported yet',
        'Donate to a drive to see it here.',
      ),
      DonorActivityView.donations => (
        'No donations yet',
        'Donate to a drive to track it here.',
      ),
    };
    // Top padding keeps the empty state clear of the header band's
    // rounded bottom edge instead of centring it right against it.
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 56, 32, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.volunteer_activism_outlined,
            size: 48,
            color: DonorAccents.donated.withValues(alpha: 0.45),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.secondary.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
