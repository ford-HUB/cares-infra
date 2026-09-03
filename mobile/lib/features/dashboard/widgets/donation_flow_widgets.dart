import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/donation_store.dart';

/// Shared presentational widgets for the multi-step donation flow.

IconData paymentMethodIcon(DonationPaymentMethod method) => switch (method) {
  DonationPaymentMethod.gcash => Icons.account_balance_wallet_outlined,
  DonationPaymentMethod.maya => Icons.account_balance_wallet_outlined,
  DonationPaymentMethod.card => Icons.credit_card_outlined,
  DonationPaymentMethod.bank => Icons.account_balance_outlined,
};

/// Title + supporting copy shown at the top of each step.
class DonationStepHeader extends StatelessWidget {
  const DonationStepHeader({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            height: 1.25,
          ),
        ),
        if (subtitle case final sub?) ...[
          const SizedBox(height: 6),
          Text(
            sub,
            style: const TextStyle(
              fontSize: 13.5,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ],
    );
  }
}

/// Large selectable tile (donation type, payment method, handover option).
class DonationOptionTile extends StatelessWidget {
  const DonationOptionTile({
    super.key,
    required this.title,
    required this.selected,
    required this.onTap,
    this.subtitle,
    this.icon,
    this.leading,
  });

  final String title;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.primary.withValues(alpha: 0.08)
          : AppColors.surface,
      borderRadius: BorderRadius.circular(AppColors.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.borderCard,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              if (leading != null)
                leading!
              else if (icon != null)
                Container(
                  width: 42,
                  height: 42,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, size: 20, color: AppColors.primary),
                ),
              if (leading != null || icon != null) const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (subtitle case final sub?) ...[
                      const SizedBox(height: 3),
                      Text(
                        sub,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selected ? AppColors.primary : AppColors.textMuted,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Preset amount chip for the money step.
class DonationPresetChip extends StatelessWidget {
  const DonationPresetChip({
    super.key,
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
      color: selected ? AppColors.primary : AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.borderCard,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One label/value line in a review or receipt card.
class DonationSummaryRow {
  const DonationSummaryRow(this.label, this.value, {this.emphasize = false});

  final String label;
  final String value;
  final bool emphasize;
}

/// Card that renders a list of [DonationSummaryRow]s with dividers.
class DonationSummaryCard extends StatelessWidget {
  const DonationSummaryCard({super.key, required this.rows});

  final List<DonationSummaryRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: 1, color: AppColors.inputFill),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 13),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 116,
                    child: Text(
                      rows[i].label,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      rows[i].value,
                      style: TextStyle(
                        fontSize: rows[i].emphasize ? 15 : 13.5,
                        fontWeight: rows[i].emphasize
                            ? FontWeight.w800
                            : FontWeight.w600,
                        color: rows[i].emphasize
                            ? AppColors.primary
                            : AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Small status pill (e.g. "Completed", "Waiting for Pickup").
class DonationStatusPill extends StatelessWidget {
  const DonationStatusPill({
    super.key,
    required this.label,
    this.done = true,
    this.cancelled = false,
  });

  final String label;

  /// When false the pill reads as "in progress" (amber clock) rather than done.
  final bool done;

  /// Overrides styling to a red "cancelled" look.
  final bool cancelled;

  @override
  Widget build(BuildContext context) {
    final color = cancelled
        ? AppColors.error
        : (done ? AppColors.primary : AppColors.accentOrange);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            cancelled
                ? Icons.cancel_rounded
                : (done ? Icons.check_circle_rounded : Icons.schedule_rounded),
            size: 14,
            color: color,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Vertical tracker for a goods donation's lifecycle. Shows the four forward
/// steps normally, or a Pledged → Cancelled path when the donation is cancelled.
class GoodsStatusTracker extends StatelessWidget {
  const GoodsStatusTracker({super.key, required this.status});

  final GoodsDonationStatus status;

  static const _forward = [
    GoodsDonationStatus.pledged,
    GoodsDonationStatus.waitingForPickup,
    GoodsDonationStatus.verifying,
    GoodsDonationStatus.confirmed,
  ];

  @override
  Widget build(BuildContext context) {
    if (status == GoodsDonationStatus.cancelled) {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _StatusStep(label: 'Pledged', state: _StepState.done, isLast: false),
          _StatusStep(
            label: 'Cancelled',
            state: _StepState.cancelled,
            isLast: true,
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < _forward.length; i++)
          _StatusStep(
            label: _forward[i].label,
            state: _stateFor(i),
            isLast: i == _forward.length - 1,
          ),
      ],
    );
  }

  _StepState _stateFor(int index) {
    if (status == GoodsDonationStatus.confirmed) return _StepState.done;
    if (index < status.index) return _StepState.done;
    if (index == status.index) return _StepState.current;
    return _StepState.pending;
  }
}

enum _StepState { done, current, pending, cancelled }

class _StatusStep extends StatelessWidget {
  const _StatusStep({
    required this.label,
    required this.state,
    required this.isLast,
  });

  final String label;
  final _StepState state;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final isDone = state == _StepState.done;
    final isCurrent = state == _StepState.current;
    final isCancelled = state == _StepState.cancelled;
    final active = isDone || isCurrent || isCancelled;
    final markColor = isCancelled ? AppColors.error : AppColors.primary;
    final color = active ? markColor : AppColors.textMuted;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: (isDone || isCancelled)
                      ? markColor
                      : (isCurrent
                            ? AppColors.primary.withValues(alpha: 0.15)
                            : Colors.transparent),
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 2),
                ),
                child: isCancelled
                    ? const Icon(
                        Icons.close_rounded,
                        size: 14,
                        color: Colors.white,
                      )
                    : isDone
                    ? const Icon(
                        Icons.check_rounded,
                        size: 14,
                        color: Colors.white,
                      )
                    : (isCurrent
                          ? Center(
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            )
                          : null),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: isDone ? AppColors.primary : AppColors.inputFill,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 18, top: 2),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                color: isCancelled
                    ? AppColors.error
                    : (active ? AppColors.textPrimary : AppColors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact progress indicator "Step 2 of 4" with a track.
class DonationStepProgress extends StatelessWidget {
  const DonationStepProgress({
    super.key,
    required this.current,
    required this.total,
  });

  final int current;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Step $current of $total',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: current / total,
            minHeight: 6,
            backgroundColor: AppColors.inputFill,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}
