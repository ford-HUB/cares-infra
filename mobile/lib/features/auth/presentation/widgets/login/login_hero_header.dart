import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/cares_logo.dart';
import 'package:mobile/features/auth/presentation/widgets/weather_panel.dart';
import 'package:mobile/shared/widgets/brand_wave.dart';
import 'package:mobile/shared/widgets/staggered_reveal.dart';

/// Photo hero at the top of login: green-tinted outreach photo, live weather
/// on the right, logo + wordmark on the left, closed by the brand wave.
///
/// When the pull callbacks are set the whole hero is the grip that drags the
/// leading story back down, and a handle with a hint sits at the very top.
class LoginHeroHeader extends StatelessWidget {
  const LoginHeroHeader({
    super.key,
    required this.progress,
    this.onPullStart,
    this.onPullUpdate,
    this.onPullEnd,
  });

  /// Intro animation progress, 0 → 1.
  final double progress;
  final GestureDragStartCallback? onPullStart;
  final GestureDragUpdateCallback? onPullUpdate;
  final GestureDragEndCallback? onPullEnd;

  /// How far the wave (and the card above it) eats into the hero's bottom.
  static const double waveHeight = 72;

  bool get _pullable => onPullUpdate != null;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final width = MediaQuery.sizeOf(context).width;

    final hero = Stack(
      children: [
        const Positioned.fill(child: _PhotoBackdrop()),
        const Positioned(
          left: 0,
          right: 0,
          bottom: -1,
          child: BrandWave.heroEdge(height: waveHeight),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            topInset + (_pullable ? 34 : 12),
            20,
            waveHeight - 2,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // No fixed height: the panel sizes itself from `width`, and
              // clamping it would clip the weather animation.
              Align(
                alignment: Alignment.centerRight,
                child: WeatherPanel(
                  width: math.min(width * 0.44, 170),
                  progress: progress,
                ),
              ),
              StaggeredReveal(
                progress: progress,
                start: 0.1,
                end: 0.45,
                lift: 18,
                child: const _Wordmark(),
              ),
            ],
          ),
        ),
        if (_pullable)
          Positioned(
            top: topInset + 8,
            left: 0,
            right: 0,
            child: Opacity(
              opacity: staggeredInterval(progress, 0.5, 0.9),
              child: const _PullHint(),
            ),
          ),
      ],
    );

    if (!_pullable) return hero;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragStart: onPullStart,
      onVerticalDragUpdate: onPullUpdate,
      onVerticalDragEnd: onPullEnd,
      child: hero,
    );
  }
}

/// The outreach photo, every hue repainted green (BlendMode.color keeps its
/// light and shade), under a scrim that is darkest at the top so the status
/// bar, hint and wordmark stay legible.
class _PhotoBackdrop extends StatelessWidget {
  const _PhotoBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.primaryDark,
        image: DecorationImage(
          image: AssetImage(AppAssets.loginEntryBanner),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.color),
        ),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.darkGreenTop.withValues(alpha: 0.86),
              AppColors.primaryDark.withValues(alpha: 0.70),
              AppColors.primary.withValues(alpha: 0.55),
            ],
          ),
        ),
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const CaresLogo(size: 62, showShadow: true),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                AppCopy.appName,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 1,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                AppCopy.fullName,
                style: TextStyle(
                  fontSize: 13.5,
                  height: 1.3,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.94),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PullHint extends StatelessWidget {
  const _PullHint();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          AppCopy.leadingPullHint,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
            color: Colors.white.withValues(alpha: 0.82),
          ),
        ),
      ],
    );
  }
}
