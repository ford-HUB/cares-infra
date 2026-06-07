import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'interest_profiling_screen.dart';
import 'models/prototype_user_data.dart';
import 'profile_completion_screen.dart';

class AccountCreatedScreen extends StatelessWidget {
  const AccountCreatedScreen({super.key, required this.userData});

  final PrototypeUserData userData;

  void _setUpInterests(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => InterestProfilingScreen(userData: userData),
      ),
    );
  }

  void _skipForNow(BuildContext context) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => ProfileCompletionScreen(userData: userData),
      ),
    );
  }

  Widget _featureCard({
    required IconData icon,
    required String label,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.inputFill),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 28, color: AppColors.primary),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const Spacer(flex: 2),
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.accent.withValues(alpha: 0.18),
                    ),
                  ),
                  Container(
                    width: 88,
                    height: 88,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 48,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                'Account Successfully Created! 🎉',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Welcome to CARES! Before we take you to your dashboard, '
                "let's personalize your experience.",
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  _featureCard(
                    icon: Icons.volunteer_activism_rounded,
                    label: 'Volunteer',
                  ),
                  const SizedBox(width: 12),
                  _featureCard(
                    icon: Icons.favorite_rounded,
                    label: 'Donate',
                  ),
                  const SizedBox(width: 12),
                  _featureCard(
                    icon: Icons.emoji_events_rounded,
                    label: 'Earn',
                  ),
                ],
              ),
              const Spacer(flex: 3),
              FilledButton.icon(
                onPressed: () => _setUpInterests(context),
                icon: const Icon(Icons.tune_rounded, size: 20),
                label: const Text('Set Up My Interests'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => _skipForNow(context),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                  minimumSize: const Size.fromHeight(52),
                ),
                child: const Text(
                  'Skip for Now',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
