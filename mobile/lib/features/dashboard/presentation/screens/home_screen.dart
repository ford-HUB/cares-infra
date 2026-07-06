import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/animated_illustration.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    this.email,
  });

  final String? email;

  @override
  Widget build(BuildContext context) {
    final greetingEmail = email?.trim();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
        automaticallyImplyLeading: false,
        title: const Text(
          AppCopy.appName,
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              const Center(
                child: AnimatedIllustration(progress: 1, size: 120),
              ),
              const SizedBox(height: 28),
              Text(
                greetingEmail != null && greetingEmail.isNotEmpty
                    ? 'Welcome to CARES'
                    : 'Welcome',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
              ),
              if (greetingEmail != null && greetingEmail.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  greetingEmail,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondary.withValues(alpha: 0.95),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Text(
                'Your account is ready. Extension programs, volunteer activities, and updates will appear here as they become available.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: AppColors.secondary.withValues(alpha: 0.9),
                ),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.accent.withValues(alpha: 0.45),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 22,
                      color: AppColors.primaryDark,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        AppCopy.slogan,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
