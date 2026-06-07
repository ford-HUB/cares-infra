import 'package:flutter/material.dart';
import '../../../../core/session/static_user_session.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/login_screen.dart';

class StudentProfileTab extends StatelessWidget {
  const StudentProfileTab({super.key, required this.user});

  final StaticSessionUser user;

  void _logout(BuildContext context) {
    StaticUserSession.instance.signOut();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Text(
          'Profile',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 24),
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: AppColors.inputFill,
                child: Icon(Icons.person_rounded,
                    size: 44, color: AppColors.primary),
              ),
              const SizedBox(height: 12),
              Text(
                user.fullName,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                user.email,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Student · Regular User',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.inputFill),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Account Information',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              _infoRow('Account type', 'Regular User'),
              _infoRow('Role', 'Student'),
              _infoRow(
                'Interests',
                user.interests.isEmpty ? '—' : user.interests.join(', '),
              ),
              _infoRow(
                'Skills',
                user.skills.isEmpty ? '—' : user.skills.join(', '),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.settings_outlined),
          label: const Text('Account Settings'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: const BorderSide(color: AppColors.primary),
            minimumSize: const Size.fromHeight(48),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => _logout(context),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Log Out'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.secondary,
            minimumSize: const Size.fromHeight(48),
          ),
        ),
      ],
    );
  }
}
