import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

class DashboardEmptyState extends StatelessWidget {
  const DashboardEmptyState({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.minHeight = 160,
  });

  final String message;
  final IconData icon;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(minHeight: minHeight),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 36, color: AppColors.secondary.withValues(alpha: 0.75)),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              height: 1.35,
              fontWeight: FontWeight.w500,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}
