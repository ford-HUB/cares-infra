import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/donor/data/donor_accent_colors.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_tab_states.dart';
import 'package:mobile/features/dashboard/screens/donation_flow_screen.dart';

/// The donor's donation tracking — every money and goods donation they made,
/// from `GET /donations/me`, with where each one stands on its ladder. A
/// tap opens the status view; the Director's moves on the portal show up
/// here on the next fetch.
class DonorActivityTab extends ConsumerWidget {
  const DonorActivityTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final donations = ref.watch(myDonationsProvider);
    final summary = DonorSummary.of(donations.asData?.value ?? const []);

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
                    'Your donations and where each one stands',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DonorSummaryRow(summary: summary),
                ],
              ),
            ),
          ),
          ...donations.when(
            loading: () => const [
              SliverPadding(
                padding: EdgeInsets.fromLTRB(20, 12, 20, 24),
                sliver: SliverToBoxAdapter(child: _ActivitySkeleton()),
              ),
            ],
            error: (error, _) => [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
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
            data: (items) => [
              if (items.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _EmptyActivityState(),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  sliver: SliverList.separated(
                    itemCount: items.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 12),
                    itemBuilder: (context, index) =>
                        _DonationActivityCard(donation: items[index]),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Confirmed total, donations on the ladder, and events supported — shared
/// with the profile tab so both tell the same story.
class DonorSummaryRow extends StatelessWidget {
  const DonorSummaryRow({super.key, required this.summary});

  final DonorSummary summary;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SummaryChip(
            icon: Icons.volunteer_activism_outlined,
            color: DonorAccents.donated,
            value: DonationFormat.peso(summary.confirmedAmount),
            label: 'Confirmed',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryChip(
            icon: Icons.favorite_outline,
            color: DonorAccents.donations,
            value: '${summary.donations}',
            label: 'Donations',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryChip(
            icon: Icons.campaign_outlined,
            color: DonorAccents.campaigns,
            value: '${summary.campaigns}',
            label: 'Campaigns',
          ),
        ),
      ],
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
              fontSize: 16,
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
                            color: AppColors.secondary.withValues(alpha: 0.95),
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
  const _EmptyActivityState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
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
            'No donations yet',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.secondary.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Donate to a campaign to track it here.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.secondary.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}
