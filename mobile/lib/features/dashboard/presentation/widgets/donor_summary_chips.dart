import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';

/// Which slice of the ledger the donor Activity tab lists.
enum DonorActivityView {
  /// Only donations a director has confirmed.
  confirmed,

  /// Every donation, newest first.
  donations,

  /// Donations grouped under the drive they went to.
  drives,
}

/// Confirmed total, donation count and drives supported, sitting in the
/// [DeepTabHeader] band. Each figure is also a filter chip — the same
/// selected / unselected look as the band's period chips on Ranks — and
/// tapping one switches what the list below shows.
class DonorSummaryRow extends StatelessWidget {
  const DonorSummaryRow({
    super.key,
    required this.summary,
    required this.selected,
    required this.onSelected,
  });

  final DonorSummary summary;
  final DonorActivityView selected;
  final ValueChanged<DonorActivityView> onSelected;

  @override
  Widget build(BuildContext context) {
    Widget chip(
      DonorActivityView view,
      IconData icon,
      String value,
      String label,
    ) {
      return Expanded(
        child: _SummaryChip(
          icon: icon,
          value: value,
          label: label,
          selected: selected == view,
          onTap: () => onSelected(view),
        ),
      );
    }

    return Row(
      children: [
        chip(
          DonorActivityView.confirmed,
          Icons.volunteer_activism_outlined,
          DonationFormat.peso(summary.confirmedAmount),
          'Confirmed',
        ),
        const SizedBox(width: 8),
        chip(
          DonorActivityView.donations,
          Icons.favorite_outline,
          '${summary.donations}',
          'Donations',
        ),
        const SizedBox(width: 8),
        chip(
          DonorActivityView.drives,
          Icons.campaign_outlined,
          '${summary.campaigns}',
          'Drives',
        ),
      ],
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.icon,
    required this.value,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const shape = StadiumBorder();
    return Semantics(
      button: true,
      selected: selected,
      label: '$label $value',
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 56,
        decoration: ShapeDecoration(
          color: selected ? AppColors.navActiveFill : Colors.white,
          shape: StadiumBorder(
            side: BorderSide(
              color: selected
                  ? Colors.white.withValues(alpha: 0.55)
                  : Colors.transparent,
              width: 1.2,
            ),
          ),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            customBorder: shape,
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 12, 0),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(
                        alpha: selected ? 0.38 : 0.16,
                      ),
                      borderRadius: selected ? BorderRadius.circular(9) : null,
                      shape: selected ? BoxShape.rectangle : BoxShape.circle,
                    ),
                    child: Icon(
                      icon,
                      size: 17,
                      color: selected ? Colors.white : AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            value,
                            style: TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              height: 1.15,
                              color: selected
                                  ? Colors.white
                                  : AppColors.primaryDark,
                            ),
                          ),
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              height: 1.2,
                              color: selected
                                  ? Colors.white.withValues(alpha: 0.85)
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
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
