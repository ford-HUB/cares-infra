import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/id_extraction_review.dart';

/// Lists the extracted fields that are missing or doubtful, so they get
/// checked before the details are submitted.
class IdExtractionFlagsCard extends StatelessWidget {
  const IdExtractionFlagsCard({super.key, required this.flags});

  final List<IdFieldFlag> flags;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.fact_check_outlined,
                size: 20,
                color: AppColors.accentOrange,
              ),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Check these fields before continuing',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          for (final flag in flags)
            Padding(
              padding: const EdgeInsets.only(left: 30, top: 4),
              child: Text(
                '• ${flag.message}',
                style: TextStyle(
                  fontSize: 12.5,
                  height: 1.35,
                  color: AppColors.primaryDark.withValues(alpha: 0.85),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
