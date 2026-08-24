import 'package:flutter/material.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/dashboard/data/donation_store.dart';
import 'package:mobile/features/dashboard/data/mock_donor_ranks.dart';

/// Donor profile and account settings — mirrors [ProfileTabScreen] layout.
class DonorProfileTab extends StatelessWidget {
  const DonorProfileTab({super.key, required this.donor});

  final DonorSessionUser donor;

  void _showMockAction(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _signOut(BuildContext context) {
    DonorSession.instance.signOut();

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalDonated = DonationStore.instance.totalDonatedDisplayForEmail(
      donor.email,
    );
    final donationsCount = DonationStore.instance.donationsCountForEmail(
      donor.email,
    );
    final donations = DonationStore.instance.donationsForEmail(donor.email);
    final campaignsSupported = donations.isEmpty
        ? donationsCount
        : donations.map((d) => d.campaignTitle).toSet().length;
    final tier = MockDonorRanks.tierForAmount(totalDonated);

    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Profile',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _ProfileHeader(donor: donor, tierName: tier.name),
                  const SizedBox(height: 16),
                  _DonorStatsRow(
                    totalDonated: totalDonated,
                    donationsCount: donationsCount,
                    campaignsSupported: campaignsSupported,
                  ),
                  const SizedBox(height: 20),
                  const _SectionTitle(title: 'Account'),
                  const SizedBox(height: 8),
                  _MenuTile(
                    icon: Icons.help_outline,
                    label: 'Help & support',
                    onTap: () =>
                        _showMockAction(context, 'Help center coming soon.'),
                  ),
                  _MenuTile(
                    icon: Icons.logout,
                    label: 'Sign out',
                    destructive: true,
                    onTap: () => _signOut(context),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.donor, required this.tierName});

  final DonorSessionUser donor;
  final String tierName;

  @override
  Widget build(BuildContext context) {
    final name = donor.fullName;
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: AppColors.primaryDark,
            child: Text(
              initial,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  donor.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppColors.secondary.withValues(alpha: 0.95),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$tierName Donor',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                    ),
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
            value: DonationStore.formatPeso(totalDonated),
            label: 'Total donated',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.favorite_outline,
            value: '$donationsCount',
            label: 'Donations',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.campaign_outlined,
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
    required this.value,
    required this.label,
  });

  final IconData icon;
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
          Icon(icon, size: 22, color: AppColors.primaryDark),
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

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w800,
        color: AppColors.primaryDark,
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.heart : AppColors.primaryDark;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            children: [
              Icon(icon, size: 22, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ),
              Icon(Icons.chevron_right, color: color.withValues(alpha: 0.7)),
            ],
          ),
        ),
      ),
    );
  }
}
