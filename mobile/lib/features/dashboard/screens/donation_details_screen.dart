import 'package:flutter/material.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/donation_store.dart';
import '../data/mock_donations.dart';
import '../widgets/donation_dialogs.dart';

class DonationDetailsScreen extends StatefulWidget {
  const DonationDetailsScreen({super.key, required this.donation});

  final CaresDonation donation;

  static void open(BuildContext context, CaresDonation donation) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DonationDetailsScreen(donation: donation),
      ),
    );
  }

  @override
  State<DonationDetailsScreen> createState() => _DonationDetailsScreenState();
}

class _DonationDetailsScreenState extends State<DonationDetailsScreen> {
  int _selectedAmount = 500;

  static const _presetAmounts = [100, 250, 500, 1000];

  Future<void> _confirmDonation() async {
    final confirmed = await showDonationConfirmationDialog(
      context,
      donation: widget.donation,
      amount: _selectedAmount,
    );

    if (confirmed != true || !mounted) return;

    final email =
        StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';
    DonationStore.instance.recordDonation(
      donationId: widget.donation.id,
      campaignTitle: widget.donation.title,
      amount: _selectedAmount,
      donorEmail: email,
    );

    if (!mounted) return;
    await showDonationSuccessDialog(
      context,
      donation: widget.donation,
      amount: _selectedAmount,
    );

    if (!mounted) return;
    Navigator.of(context).pop();
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
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primaryLight, AppColors.primary],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
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
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9)),
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
          const Text(
            'Select amount',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _presetAmounts.map((amount) {
              final selected = _selectedAmount == amount;
              return ChoiceChip(
                label: Text('₱$amount'),
                selected: selected,
                onSelected: (_) => setState(() => _selectedAmount = amount),
                selectedColor: AppColors.primary.withValues(alpha: 0.15),
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: selected ? AppColors.primary : AppColors.textSecondary,
                ),
                side: BorderSide(
                  color: selected ? AppColors.primary : AppColors.inputFill,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: _confirmDonation,
            icon: const Icon(Icons.favorite_rounded),
            label: Text('Donate ₱$_selectedAmount'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
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
