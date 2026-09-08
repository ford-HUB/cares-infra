import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Shared building blocks for the "donor style" registration forms.
///
/// The pattern is: a gradient hero panel that sells the account type, then a
/// stack of white [RegistrationFormCard]s that each group one idea (your name,
/// who you are, sign-in details), and a sticky action bar at the bottom of the
/// screen. Password fields are always followed by the strength bar, the
/// [PasswordRuleChips] row and, once the user types a confirmation, the
/// [PasswordMatchNote].

/// Gradient intro panel used at the top of a registration form.
class RegistrationHeroPanel extends StatelessWidget {
  const RegistrationHeroPanel({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.highlights,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  /// Short "what you get" lines, each with its own leading icon.
  final List<(IconData, String)> highlights;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryDark,
            AppColors.primary,
            AppColors.secondary,
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x331F5F28),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFFE3F2E4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (highlights.isNotEmpty) const SizedBox(height: 18),
          for (final highlight in highlights) ...[
            Row(
              children: [
                Icon(
                  highlight.$1,
                  size: 17,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    highlight.$2,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      color: Color(0xFFEAF5E9),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            if (highlight != highlights.last) const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

/// White card grouping one set of related fields.
class RegistrationFormCard extends StatelessWidget {
  const RegistrationFormCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard().copyWith(
        // Keeps the card readable on a white page as well as the green one.
        boxShadow: const [
          BoxShadow(
            color: Color(0x121F5F28),
            blurRadius: 14,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.accentLight.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppColors.primaryDark),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.35,
                        color: AppColors.secondary.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}

/// Compact selectable tile — used where a form needs an inline either/or
/// choice (individual vs organization) without leaving the card.
class RegistrationChoiceTile extends StatelessWidget {
  const RegistrationChoiceTile({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.accentLight.withValues(alpha: 0.35)
              : AppColors.background,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.secondary : AppColors.borderLight,
            width: isSelected ? 1.6 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Icon(
                icon,
                size: 18,
                color: isSelected ? Colors.white : AppColors.primaryDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.35,
                      color: AppColors.secondary.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              isSelected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 20,
              color: isSelected ? AppColors.secondary : AppColors.textMuted,
            ),
          ],
        ),
      ),
    );
  }
}

/// Small pass/fail pill for one password requirement.
class PasswordRuleChip extends StatelessWidget {
  const PasswordRuleChip({super.key, required this.label, required this.met});

  final String label;
  final bool met;

  @override
  Widget build(BuildContext context) {
    final color = met ? AppColors.secondary : AppColors.textMuted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: met
            ? AppColors.accentLight.withValues(alpha: 0.45)
            : AppColors.background,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        border: Border.all(color: met ? AppColors.light : AppColors.borderLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            met ? Icons.check_rounded : Icons.circle_outlined,
            size: 13,
            color: color,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// The three password rules the donor form shows, as one wrapping row.
class PasswordRuleChips extends StatelessWidget {
  const PasswordRuleChips({super.key, required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        PasswordRuleChip(label: '8+ characters', met: password.length >= 8),
        PasswordRuleChip(
          label: 'Upper & lower case',
          met:
              RegExp(r'[A-Z]').hasMatch(password) &&
              RegExp(r'[a-z]').hasMatch(password),
        ),
        PasswordRuleChip(
          label: 'A number',
          met: RegExp(r'[0-9]').hasMatch(password),
        ),
      ],
    );
  }
}

/// "Passwords match" / "Passwords do not match" line under the confirm field.
class PasswordMatchNote extends StatelessWidget {
  const PasswordMatchNote({super.key, required this.matches});

  final bool matches;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          matches ? Icons.check_circle_rounded : Icons.error_outline_rounded,
          size: 16,
          color: matches ? AppColors.secondary : AppColors.heart,
        ),
        const SizedBox(width: 6),
        Text(
          matches ? 'Passwords match' : 'Passwords do not match',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: matches ? AppColors.secondary : AppColors.heart,
          ),
        ),
      ],
    );
  }
}
