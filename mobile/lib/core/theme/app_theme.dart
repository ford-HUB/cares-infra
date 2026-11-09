import 'package:flutter/material.dart';

/// Environmental green palette — sage background, forest accents.
class AppColors {
  // Main surfaces
  /// Mint page ground behind white cards (2026-11-09 reference set).
  static const Color background = Color(0xFFF1F7EF);
  static const Color surface = Color(0xFFFEFEFE);

  // Brand greens
  static const Color primary = Color(0xFF2D7634);
  static const Color primaryDark = Color(0xFF1F5F28);
  static const Color primaryLight = Color(0xFF3A9042);
  static const Color secondary = Color(0xFF4CAF50);
  static const Color accentLight = Color(0xFFC1D8B9);
  static const Color light = Color(0xFFA5D6A7);

  // Legacy aliases used across the app
  static const Color accent = Color(0xFF6E9E58);
  static const Color accentBright = Color(0xFF8DB878);
  static const Color accentYellow = Color(0xFF8DB878);
  static const Color accentGreen = Color(0xFF1F5F28);

  // Semantic
  static const Color error = Color(0xFFC62828);
  static const Color accentOrange = Color(0xFFE65100);
  static const Color heart = Color(0xFFE53935);

  /// "Not there yet" — a password rule still unmet, a strength bar short of the policy.
  static const Color warning = Color(0xFFFF9800);

  // Fills & borders
  static const Color inputFill = Color(0xFFCFE8C8);
  static const Color fieldFill = Colors.white;
  static const Color borderCard = Color(0xFFB7DDB5);
  static const Color borderLight = Color(0xFFCFE8C8);
  static const Color fieldBorder = Color(0xFFC8E6C9);
  static const Color borderActive = Color(0xFF2D7634);

  // Text — headings stay dark green; body copy, typed input and hints are
  // ink greys (the user's "black way", 2026-11-09), never bright green.
  static const Color textPrimary = Color(0xFF1F5F28);
  static const Color textSecondary = Color(0xFF4A544E);
  static const Color textMuted = Color(0xFF8B968F);

  // "Dark green → black" immersive surface (see mobile-flutter skill).
  static const Color darkGreenTop = Color(0xFF0F2A1A);
  static const Color darkGreenMid = Color(0xFF0B1F14);
  static const Color darkGreenBottom = Color(0xFF050A07);
  static const Color darkGreenField = Color(0xFF1A2F22);
  static const Color onDarkGreen = Color(0xFFFFFFFF);
  static const Color onDarkGreenMuted = Color(0xFFB7C9BC);

  // "Photo hero + floating card" pattern (login, 2026-11-09 — see the
  // mobile-flutter skill). Soft fields and secondary buttons share one pale
  // green fill; body copy on the white card is ink, not green.
  static const Color softFieldFill = Color(0xFFEFF7EB);
  static const Color softFieldBorder = Color(0xFFD2E6CB);
  static const Color ink = Color(0xFF2B3830);
  static const Color inkMuted = Color(0xFF6F7D72);
  static const Color waveHighlight = Color(0xFF9CCC65);

  // Header bands and the dashboard chrome.
  static const Color headerTop = Color(0xFF13622A);
  static const Color headerBottom = Color(0xFF2E9B3F);
  static const Color deepHeaderTop = Color(0xFF0B3A1A);
  static const Color deepHeaderBottom = Color(0xFF15592B);
  static const Color cardBorder = Color(0xFFD5E8D0);
  static const Color navBar = Color(0xFF0E3B1C);
  static const Color navActiveFill = Color(0xFF1E5A27);
  static const Color navActive = Color(0xFF9BDB5A);

  /// Glassy search field / icon button sitting on a deep header band.
  static const Color onHeaderField = Color(0x33FFFFFF);

  static const double cardRadius = 18;
  static const double pillRadius = 999;

  static const List<Color> communityRing = [
    Color(0xFF7E57C2),
    Color(0xFF42A5F5),
    Color(0xFF66BB6A),
    Color(0xFFFFCA28),
    Color(0xFFEF5350),
    Color(0xFF26A69A),
  ];
}

/// Brand gradients — only for the one element per screen that should pull the
/// eye (the primary action button).
abstract final class AppGradients {
  static const LinearGradient primaryButton = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [AppColors.primaryLight, AppColors.primaryDark],
  );

  /// Registration / settings header band: dark green top-left → fresh green.
  static const LinearGradient header = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.headerTop, AppColors.primary, AppColors.headerBottom],
  );

  /// Dashboard header band (home, events, notifications): deep forest green.
  static const LinearGradient deepHeader = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.deepHeaderTop, AppColors.deepHeaderBottom],
  );

  /// Mint page ground, slightly lighter at the top.
  static const LinearGradient page = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF6FAF4), AppColors.background],
  );
}

/// Reusable surfaces matching the eco-friendly dashboard palette.
class AppDecorations {
  /// White card that floats over a photo hero and the page waves.
  static BoxDecoration floatingCard({double radius = 24}) {
    return BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(radius),
      boxShadow: const [
        BoxShadow(
          color: Color(0x240B3D14),
          blurRadius: 28,
          offset: Offset(0, 12),
        ),
      ],
    );
  }

  /// White card on the mint ground: hairline green border + soft lift.
  static BoxDecoration groundCard({double radius = 22}) {
    return BoxDecoration(
      color: Colors.white.withValues(alpha: 0.94),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: AppColors.cardBorder),
      boxShadow: const [
        BoxShadow(
          color: Color(0x141F5F28),
          blurRadius: 18,
          offset: Offset(0, 8),
        ),
      ],
    );
  }

  /// Rounded tinted square holding a section / list icon.
  static BoxDecoration iconTile({Color? tint, double radius = 16}) {
    return BoxDecoration(
      color: (tint ?? AppColors.primary).withValues(alpha: 0.14),
      borderRadius: BorderRadius.circular(radius),
    );
  }

  /// Pale green filled field with a dark green leading icon.
  static InputDecoration softInput({
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
    const radius = BorderRadius.all(Radius.circular(14));
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: AppColors.inkMuted, fontSize: 15.5),
      filled: true,
      fillColor: AppColors.softFieldFill,
      prefixIcon: Icon(icon, color: AppColors.primaryDark, size: 22),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: const OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: AppColors.softFieldBorder),
      ),
      enabledBorder: const OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: AppColors.softFieldBorder),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }

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
      secondary: AppColors.secondary,
      tertiary: AppColors.accentBright,
      surface: AppColors.surface,
      onSurface: AppColors.ink,
      brightness: Brightness.light,
    );

    const borderRadius = BorderRadius.all(Radius.circular(14));

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      // Edge-swipe back on every route: Android's predictive back drags the
      // page with the finger (needs enableOnBackInvokedCallback in the
      // manifest), iOS gets the native swipe-from-edge pop.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Roboto',
      // Headings dark green; everything a person reads or types is ink.
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
          height: 1.25,
        ),
        headlineMedium: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
          height: 1.3,
        ),
        titleLarge: TextStyle(
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
        ),
        titleMedium: TextStyle(fontSize: 16, color: AppColors.ink),
        titleSmall: TextStyle(color: AppColors.ink),
        bodyLarge: TextStyle(fontSize: 16, color: AppColors.ink, height: 1.5),
        bodyMedium: TextStyle(color: AppColors.textSecondary),
        bodySmall: TextStyle(color: AppColors.textSecondary),
        labelLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: AppColors.primary,
        selectionColor: AppColors.secondary.withValues(alpha: 0.3),
        selectionHandleColor: AppColors.primary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleTextStyle: TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: const BorderSide(color: AppColors.cardBorder),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        titleTextStyle: const TextStyle(
          fontSize: 21,
          fontWeight: FontWeight.w800,
          color: AppColors.textPrimary,
        ),
        contentTextStyle: const TextStyle(
          fontSize: 15,
          height: 1.45,
          color: AppColors.textSecondary,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: AppColors.cardBorder,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.cardBorder,
        thickness: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: AppColors.primaryDark,
        checkmarkColor: Colors.white,
        side: const BorderSide(color: AppColors.cardBorder),
        shape: const StadiumBorder(),
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          color: AppColors.primaryDark,
        ),
        secondaryLabelStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      ),
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        side: const BorderSide(color: AppColors.primary, width: 1.8),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.navBar,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 54),
          textStyle: const TextStyle(
            fontSize: 16.5,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.borderLight,
          disabledForegroundColor: AppColors.textMuted,
          minimumSize: const Size(double.infinity, 54),
          textStyle: const TextStyle(
            fontSize: 16.5,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryDark,
          backgroundColor: AppColors.softFieldFill,
          side: const BorderSide(color: AppColors.softFieldBorder),
          textStyle: const TextStyle(
            fontSize: 15.5,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
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
        fillColor: AppColors.softFieldFill,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 17,
        ),
        border: const OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: AppColors.softFieldBorder),
        ),
        enabledBorder: const OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: AppColors.softFieldBorder),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: const OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: const OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: AppColors.error, width: 1.5),
        ),
        hintStyle: const TextStyle(color: AppColors.inkMuted, fontSize: 15.5),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        floatingLabelStyle: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
        ),
        helperStyle: const TextStyle(color: AppColors.textSecondary),
        prefixIconColor: AppColors.primaryDark,
        suffixIconColor: AppColors.primary,
      ),
    );
  }
}

ThemeData buildAppTheme() => AppTheme.light;
