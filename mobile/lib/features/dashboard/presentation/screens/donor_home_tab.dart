import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/donor/data/donor_accent_colors.dart';
import 'package:mobile/features/dashboard/data/donation_store.dart';
import 'package:mobile/features/dashboard/data/mock_donations.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_card.dart';
import 'package:mobile/features/dashboard/screens/donation_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/donation_cards.dart';

class DonorHomeTab extends StatelessWidget {
  const DonorHomeTab({
    super.key,
    required this.firstName,
    required this.email,
    this.showProfileCompletionCard = false,
    this.onCompleteProfile,
  });

  final String firstName;
  final String email;
  final bool showProfileCompletionCard;
  final VoidCallback? onCompleteProfile;

  int get _totalDonated =>
      DonationStore.instance.totalDonatedDisplayForEmail(email);

  int get _donationsCount =>
      DonationStore.instance.donationsCountForEmail(email);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            HomeHeader(firstName: firstName, points: _totalDonated),
            const SizedBox(height: 22),
            FeaturedDonationsCarousel(donations: kMockFeaturedDonations),
            const SizedBox(height: 22),
            _DonorStatsRow(
              totalDonated: _totalDonated,
              donationsCount: _donationsCount,
              campaignsSupported: _donationsCount,
            ),
            if (showProfileCompletionCard) ...[
              const SizedBox(height: 16),
              ProfileCompletionCard(
                onTap: onCompleteProfile,
                title: 'Complete Your Profile',
                subtitle:
                    'Add your interests & giving preferences to get matched '
                    'campaigns',
                icon: Icons.favorite_outline_rounded,
              ),
            ],
            const SizedBox(height: 28),
            Text(
              'Donation Campaigns',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            for (final donation in kMockDonationCampaigns)
              UpcomingDonationCard(
                donation: donation,
                onTap: () => DonationDetailsScreen.open(
                  context,
                  donation,
                  donorEmail: email,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DonorStatsRow extends StatelessWidget {
  const _DonorStatsRow({
    required this.totalDonated,
    required this.donationsCount,
    required this.campaignsSupported,
  });

  final int totalDonated;
  final int donationsCount;
  final int campaignsSupported;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.volunteer_activism_outlined,
            color: DonorAccents.donated,
            value: DonationStore.formatPeso(totalDonated),
            label: 'Total donated',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.favorite_outline,
            color: DonorAccents.donations,
            value: '$donationsCount',
            label: 'Donations',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.campaign_outlined,
            color: DonorAccents.campaigns,
            value: '$campaignsSupported',
            label: 'Campaigns',
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
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
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 22, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 2),
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
