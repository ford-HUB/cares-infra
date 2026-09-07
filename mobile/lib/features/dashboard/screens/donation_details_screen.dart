import 'package:flutter/material.dart';
import '../../../core/constants/app_assets.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/mock_donations.dart';
import 'donation_flow_screen.dart';

class DonationDetailsScreen extends StatefulWidget {
  const DonationDetailsScreen({
    super.key,
    required this.donation,
    this.donorEmail,
  });

  final CaresDonation donation;
  final String? donorEmail;

  static void open(
    BuildContext context,
    CaresDonation donation, {
    String? donorEmail,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            DonationDetailsScreen(donation: donation, donorEmail: donorEmail),
      ),
    );
  }

  @override
  State<DonationDetailsScreen> createState() => _DonationDetailsScreenState();
}

class _DonationDetailsScreenState extends State<DonationDetailsScreen> {
  String get _donorEmail =>
      widget.donorEmail ??
      StaticUserSession.instance.currentUser?.email ??
      'guest@cares.local';

  void _startDonation() {
    DonationFlowScreen.open(
      context,
      campaign: widget.donation,
      donorEmail: _donorEmail,
    );
  }

  @override
  Widget build(BuildContext context) {
    final donation = widget.donation;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Donation Details'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: FilledButton.icon(
            onPressed: _startDonation,
            icon: const Icon(Icons.volunteer_activism_rounded),
            label: const Text('Donate'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.asset(
                    AppAssets.campaignPhoto,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.05),
                          Colors.black.withValues(alpha: 0.55),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        donation.category,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        donation.title,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        donation.organization,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _StatBox(label: 'Raised', value: donation.raisedLabel),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatBox(label: 'Goal', value: donation.goalLabel),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: donation.progress.clamp(0, 1),
              minHeight: 8,
              backgroundColor: AppColors.inputFill,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${donation.progressPercentLabel} funded · ${donation.countdownLeftLabel}',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'About this campaign',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            donation.description,
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          // Container(
          //   padding: const EdgeInsets.all(16),
          //   decoration: BoxDecoration(
          //     color: AppColors.surface,
          //     borderRadius: BorderRadius.circular(14),
          //     border: Border.all(color: AppColors.inputFill),
          //   ),
          //   child: Row(
          //     children: [
          //       Container(
          //         width: 40,
          //         height: 40,
          //         decoration: BoxDecoration(
          //           color: AppColors.primary.withValues(alpha: 0.1),
          //           borderRadius: BorderRadius.circular(10),
          //         ),
          //         child: const Icon(
          //           Icons.handshake_outlined,
          //           size: 20,
          //           color: AppColors.primary,
          //         ),
          //       ),
          //       const SizedBox(width: 12),
          //       const Expanded(
          //         child: Text(
          //           'Tap Donate to choose how you want to help — money or '
          //           'goods. You can review everything before anything is '
          //           'confirmed.',
          //           style: TextStyle(
          //             fontSize: 13,
          //             color: AppColors.textSecondary,
          //             height: 1.4,
          //           ),
          //         ),
          //       ),
          //     ],
          //   ),
          // ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}
