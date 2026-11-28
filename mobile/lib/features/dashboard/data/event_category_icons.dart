import 'package:flutter/material.dart';

/// Mock/design data: the server sends no icon per category.
const Map<String, IconData> kEventCategoryIcons = {
  'All': Icons.grid_view_rounded,
  'School': Icons.school_rounded,
  'Community': Icons.groups_rounded,
  'Emergency': Icons.emergency_rounded,
  'Donation Drive': Icons.volunteer_activism_rounded,
  'Charity': Icons.favorite_rounded,
  'Relief Program': Icons.inventory_2_rounded,
  'Health': Icons.medical_services_rounded,
  'Outreach': Icons.handshake_rounded,
  'Training': Icons.construction_rounded,
  'Seminar': Icons.record_voice_over_rounded,
  'Others': Icons.more_horiz_rounded,
  'Environment': Icons.eco_rounded,
  'Education': Icons.menu_book_rounded,
};

IconData eventCategoryIcon(String category) {
  for (final entry in kEventCategoryIcons.entries) {
    if (entry.key.toLowerCase() == category.toLowerCase()) {
      return entry.value;
    }
  }
  return Icons.event_rounded;
}
