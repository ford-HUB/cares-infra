import 'package:flutter/material.dart';

/// Environmental green palette — sage background, forest accents.
class AppColors {
  // Main surfaces
  static const Color background = Color(0xFFF0F7E8);
  static const Color surface = Color(0xFFFEFEFE);

  // Brand greens
  static const Color primary = Color(0xFF2D7634);
  static const Color primaryDark = Color(0xFF1F5F28);
  static const Color primaryLight = Color(0xFF3A9042);
  static const Color accentLight = Color(0xFFC1D8B9);

  // Legacy aliases used across the app
  static const Color accent = Color(0xFF6E9E58);
  static const Color accentBright = Color(0xFF8DB878);
  static const Color accentYellow = Color(0xFF8DB878);
  static const Color accentGreen = Color(0xFF1F5F28);

  // Semantic
  static const Color secondary = Color(0xFFC62828);
  static const Color accentOrange = Color(0xFFE65100);

  // Fills & borders
  static const Color inputFill = Color(0xFFCFE8C8);
  static const Color borderCard = Color(0xFFB7DDB5);
  static const Color borderLight = Color(0xFFCFE8C8);
  static const Color borderActive = Color(0xFF2D7634);

  // Text
  static const Color textPrimary = Color(0xFF1F5F28);
  static const Color textSecondary = Color(0xFF6E9E58);
  static const Color textMuted = Color(0xFF95B888);

  static const double cardRadius = 18;
  static const double pillRadius = 999;
}

/// Reusable surfaces matching the eco-friendly dashboard palette.
class AppDecorations {
  static BoxDecoration surfaceCard({
    Color? color,
    double radius = AppColors.cardRadius,
  }) {
    return BoxDecoration(
      color: color ?? AppColors.surface,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: AppColors.borderCard, width: 1),
    );
  }

  static BoxDecoration softBadge({Color? fill}) {
    return BoxDecoration(
      color: fill ?? AppColors.accentLight,
      borderRadius: BorderRadius.circular(AppColors.pillRadius),
      border: Border.all(color: AppColors.borderLight, width: 1),
    );
  }
}

class AppTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.accent,
      tertiary: AppColors.accentBright,
      surface: AppColors.surface,
      brightness: Brightness.light,
    );

    const borderRadius = BorderRadius.all(Radius.circular(12));

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          height: 1.25,
        ),
        headlineMedium: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          height: 1.3,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: AppColors.textSecondary,
          height: 1.5,
        ),
        labelLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.inputFill,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: const BorderSide(
            color: AppColors.borderActive,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: const BorderSide(color: AppColors.secondary),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: AppColors.textMuted),
        floatingLabelStyle: const TextStyle(color: AppColors.primary),
      ),
    );
  }
}
