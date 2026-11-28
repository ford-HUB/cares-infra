import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Mock/design data; keys match [kEventFilterCategories].
const Map<String, Color> kEventCategoryColors = {
  'All': AppColors.primary,
  'Environment': Color(0xFF2D7634),
  'Education': Color(0xFF1565C0),
  'Health': Color(0xFFC2185B),
  'Community': Color(0xFFE65100),
};

Color eventCategoryColor(String category) {
  for (final entry in kEventCategoryColors.entries) {
    if (entry.key.toLowerCase() == category.toLowerCase()) {
      return entry.value;
    }
  }
  return AppColors.primary;
}
