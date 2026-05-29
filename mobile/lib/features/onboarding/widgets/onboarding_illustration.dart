import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/cares_logo.dart';

enum OnboardingIllustrationType { welcome, discover, impact }

class OnboardingIllustration extends StatelessWidget {
  const OnboardingIllustration({
    super.key,
    required this.type,
  });

  final OnboardingIllustrationType type;

  @override
  Widget build(BuildContext context) {
    return switch (type) {
      OnboardingIllustrationType.welcome => const _WelcomeIllustration(),
      OnboardingIllustrationType.discover => const _DiscoverIllustration(),
      OnboardingIllustrationType.impact => const _ImpactIllustration(),
    };
  }
}

class _WelcomeIllustration extends StatelessWidget {
  const _WelcomeIllustration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 280,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.accentYellow.withValues(alpha: 0.35),
                  AppColors.primary.withValues(alpha: 0.06),
                ],
              ),
            ),
          ),
          const CaresLogo(size: 200),
          Positioned(
            top: 24,
            right: 48,
            child: _FloatingBadge(
              icon: Icons.people_rounded,
              color: AppColors.primary,
            ),
          ),
          Positioned(
            bottom: 32,
            left: 40,
            child: _FloatingBadge(
              icon: Icons.favorite_rounded,
              color: AppColors.secondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _DiscoverIllustration extends StatelessWidget {
  const _DiscoverIllustration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 280,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.secondary.withValues(alpha: 0.25),
                  AppColors.secondary.withValues(alpha: 0.04),
                ],
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _DriveCard(
                icon: Icons.campaign_rounded,
                label: 'Food Drive',
                color: AppColors.primary,
                offset: const Offset(-8, 12),
              ),
              const SizedBox(width: 12),
              _DriveCard(
                icon: Icons.school_rounded,
                label: 'Education',
                color: AppColors.secondary,
                offset: const Offset(8, -12),
              ),
            ],
          ),
          Positioned(
            bottom: 20,
            child: _FloatingBadge(
              icon: Icons.search_rounded,
              color: AppColors.primaryLight,
              size: 48,
            ),
          ),
        ],
      ),
    );
  }
}

class _ImpactIllustration extends StatelessWidget {
  const _ImpactIllustration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 280,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 230,
            height: 230,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.accentYellow.withValues(alpha: 0.35),
                  AppColors.primary.withValues(alpha: 0.08),
                ],
              ),
            ),
          ),
          Container(
            width: 170,
            height: 170,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primaryLight, AppColors.primary],
              ),
              borderRadius: BorderRadius.circular(48),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 28,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 80,
              color: Colors.white,
            ),
          ),
          Positioned(
            top: 28,
            left: 52,
            child: _FloatingBadge(
              icon: Icons.handshake_rounded,
              color: AppColors.secondary,
            ),
          ),
          Positioned(
            bottom: 28,
            right: 52,
            child: _FloatingBadge(
              icon: Icons.eco_rounded,
              color: AppColors.primaryLight,
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingBadge extends StatelessWidget {
  const _FloatingBadge({
    required this.icon,
    required this.color,
    this.size = 44,
  });

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.surface,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}

class _DriveCard extends StatelessWidget {
  const _DriveCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.offset,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Offset offset;

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: offset,
      child: Container(
        width: 110,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.2),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 36),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
