import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/donation_store.dart';
import '../widgets/donation_flow_widgets.dart';

/// Read-only view of a completed donation. Reached from the "View Donation"
/// button at the end of the flow and by tapping an item in donation history.
class DonationReceiptScreen extends StatelessWidget {
  const DonationReceiptScreen({super.key, required this.donation});

  final UserDonation donation;

  static void open(BuildContext context, UserDonation donation) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DonationReceiptScreen(donation: donation),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isMoney = donation.type == DonationType.money;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Donation Receipt'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppColors.cardRadius),
                      border: Border.all(color: AppColors.borderCard),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.verified_rounded,
                            size: 34,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          isMoney
                              ? DonationStore.formatPesoFull(donation.amount)
                              : 'Goods pledge',
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'to ${donation.campaignTitle}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        DonationStatusPill(
                          label: isMoney
                              ? donation.statusLabel
                              : donation.goodsStatus.upperLabel,
                          done: donation.isComplete,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  DonationSummaryCard(
                    rows: [
                      DonationSummaryRow('Campaign', donation.campaignTitle),
                      DonationSummaryRow('Donation type', donation.type.label),
                      if (isMoney) ...[
                        DonationSummaryRow(
                          'Amount',
                          DonationStore.formatPesoFull(donation.amount),
                        ),
                        if (donation.paymentMethod != null)
                          DonationSummaryRow(
                            'Payment method',
                            donation.paymentMethod!.label,
                          ),
                      ] else ...[
                        DonationSummaryRow('Item', donation.goodsItem ?? '—'),
                        DonationSummaryRow('Quantity', donation.quantityLabel),
                        const DonationSummaryRow('Fulfillment', 'Pickup'),
                        if (donation.pickupDateLabel != null)
                          DonationSummaryRow(
                            'Pickup date',
                            donation.pickupDateLabel!,
                          ),
                        if (donation.pickupTimeLabel != null)
                          DonationSummaryRow(
                            'Pickup time',
                            donation.pickupTimeLabel!,
                          ),
                        if (donation.pickupAddress != null)
                          DonationSummaryRow(
                            'Pickup address',
                            donation.pickupAddress!,
                          ),
                      ],
                      DonationSummaryRow(
                        'Date',
                        DonationStore.formatDate(donation.donatedAt),
                      ),
                      DonationSummaryRow('Donation ID', donation.donationId),
                      if (!isMoney)
                        DonationSummaryRow(
                          'Status',
                          donation.goodsStatus.upperLabel,
                          emphasize: true,
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Done'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
