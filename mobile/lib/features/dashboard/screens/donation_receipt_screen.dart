import 'package:flutter/material.dart';

import '../../../core/constants/cares_office.dart';
import '../../../core/theme/app_theme.dart';
import '../data/donation_format.dart';
import '../data/models/donation_models.dart';
import '../widgets/donation_flow_widgets.dart';

/// Read-only view of a completed donation. Reached from the "View Donation"
/// button at the end of the flow and by tapping an item in donation history.
class DonationReceiptScreen extends StatelessWidget {
  const DonationReceiptScreen({super.key, required this.donation});

  final Donation donation;

  static void open(BuildContext context, Donation donation) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DonationReceiptScreen(donation: donation),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isMoney = donation.isMoney;

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
                              ? DonationFormat.pesoFull(donation.amount)
                              : donation.goodsLabel,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'to ${donation.eventTitle}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        DonationStatusPill(
                          label: donation.status.upperLabel,
                          done: donation.isComplete,
                          cancelled:
                              donation.isCancelled || donation.isDeclined,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  DonationSummaryCard(
                    rows: [
                      DonationSummaryRow('Campaign', donation.eventTitle),
                      DonationSummaryRow('Donation type', donation.kind.label),
                      if (isMoney) ...[
                        DonationSummaryRow(
                          'Amount',
                          DonationFormat.pesoFull(donation.amount),
                        ),
                        if (donation.paymentMethod != null)
                          DonationSummaryRow(
                            'Payment method',
                            donation.paymentMethod!.label,
                          ),
                        if (donation.paymentReference != null)
                          DonationSummaryRow(
                            donation.paymentReferenceLabel,
                            donation.paymentReference!,
                          ),
                      ] else ...[
                        DonationSummaryRow('Item', donation.goodsLabel),
                        DonationSummaryRow(
                          'Quantity',
                          '${donation.goodsQuantity ?? 1}',
                        ),
                        DonationSummaryRow(
                          'Credited value',
                          DonationFormat.pesoFull(donation.amount),
                        ),
                        const DonationSummaryRow(
                          'Fulfillment',
                          'Drop-off at CARES Office',
                        ),
                        if (donation.deliveryDateLabel != null)
                          DonationSummaryRow(
                            'Delivery date',
                            donation.deliveryDateLabel!,
                          ),
                        const DonationSummaryRow(
                          'Drop-off location',
                          CaresOffice.fullAddress,
                        ),
                      ],
                      DonationSummaryRow(
                        'Date',
                        DonationFormat.dateTime(donation.createdAt),
                      ),
                      DonationSummaryRow('Donation ID', donation.reference),
                      DonationSummaryRow(
                        'Status',
                        donation.status.upperLabel,
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
