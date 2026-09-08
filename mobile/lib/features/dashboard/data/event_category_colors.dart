import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Accent colors used for event category badges and filter chips.
///
/// Mock/design data only — keys match the categories in [kEventFilterCategories].
const Map<String, Color> kEventCategoryColors = {
  'All': AppColors.primary,
  'Environment': Color(0xFF2D7634),
  'Education': Color(0xFF1565C0),
  'Health': Color(0xFFC2185B),
  'Community': Color(0xFFE65100),
};

/// Accent color for [category], falling back to the brand green.
Color eventCategoryColor(String category) {
  for (final entry in kEventCategoryColors.entries) {
    if (entry.key.toLowerCase() == category.toLowerCase()) {
      return entry.value;
    }
  }
  return AppColors.primary;
}
