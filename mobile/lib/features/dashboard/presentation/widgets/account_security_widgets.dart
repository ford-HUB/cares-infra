import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';

/// Row-style entry on the Account Security landing screen: icon, label, a
/// one-line hint underneath, then a chevron. Same border/radius language as
/// the Profile tab menu so the two screens read as one list.
class SecurityActionTile extends StatelessWidget {
  const SecurityActionTile({
    super.key,
    required this.icon,
    required this.label,
    required this.hint,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String hint;

  /// Null renders the row disabled — muted text, no chevron, no ripple — for
  /// actions the account cannot take (a social sign-in changing its password).
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    final titleColor = enabled
        ? AppColors.primaryDark
        : AppColors.primaryDark.withValues(alpha: 0.45);
    final hintColor = enabled
        ? AppColors.textSecondary
        : AppColors.textSecondary.withValues(alpha: 0.7);
    return Material(
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          margin: const EdgeInsets.only(bottom: 1),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.accentLight.withValues(
                    alpha: enabled ? 0.55 : 0.3,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: titleColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: titleColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hint,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.3,
                        color: hintColor,
                      ),
                    ),
                  ],
                ),
              ),
              if (enabled)
                Icon(
                  Icons.chevron_right,
                  color: AppColors.primaryDark.withValues(alpha: 0.7),
                )
              else
                Icon(
                  Icons.lock_outline_rounded,
                  size: 18,
                  color: AppColors.primaryDark.withValues(alpha: 0.35),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Soft green note used above a form to explain what the step is for.
class SecurityInfoNote extends StatelessWidget {
  const SecurityInfoNote({
    super.key,
    required this.icon,
    required this.text,
    this.color = AppColors.primary,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12.5,
                height: 1.4,
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Sticky bottom action bar shared by the security forms — mirrors the
/// "Save changes" bar on the profile edit screen.
class SecurityActionBar extends StatelessWidget {
  const SecurityActionBar({
    super.key,
    required this.label,
    required this.busy,
    required this.onPressed,
  });

  final String label;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE6EFE3))),
      ),
      child: SizedBox(
        height: 52,
        child: ElevatedButton(
          onPressed: busy ? null : onPressed,
          child: busy
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: Colors.white,
                  ),
                )
              : Text(label),
        ),
      ),
    );
  }
}

/// Eye toggle for password fields.
class PasswordVisibilityToggle extends StatelessWidget {
  const PasswordVisibilityToggle({
    super.key,
    required this.obscured,
    required this.onToggle,
  });

  final bool obscured;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onToggle,
      tooltip: obscured ? 'Show password' : 'Hide password',
      icon: Icon(
        obscured ? Icons.visibility_outlined : Icons.visibility_off_outlined,
        size: 20,
        color: AppColors.secondary.withValues(alpha: 0.8),
      ),
    );
  }
}

/// The current sign-in email, shown up top so the person knows which address
/// the OTP will go to before they start the update flow.
class SignInEmailCard extends StatelessWidget {
  const SignInEmailCard({super.key, required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard(),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.accentLight.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.mail_outline_rounded,
              size: 22,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Sign-in email',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  email,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: AppDecorations.softBadge(),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.verified_rounded,
                  size: 13,
                  color: AppColors.primaryDark,
                ),
                SizedBox(width: 4),
                Text(
                  'Verified',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// "Connected devices" title with the session count and a "Sign out others"
/// shortcut when there is more than this device.
class DevicesSectionHeader extends StatelessWidget {
  const DevicesSectionHeader({
    super.key,
    required this.count,
    required this.onSignOutOthers,
  });

  final int count;
  final VoidCallback? onSignOutOthers;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const SecuritySectionTitle(title: 'Connected devices'),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '$count',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
        ),
        const Spacer(),
        if (onSignOutOthers != null)
          TextButton(
            onPressed: onSignOutOthers,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.heart,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              visualDensity: VisualDensity.compact,
              textStyle: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            child: const Text('Sign out others'),
          ),
      ],
    );
  }
}

class DevicesLoadError extends StatelessWidget {
  const DevicesLoadError({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SecurityInfoNote(
          icon: Icons.error_outline_rounded,
          text: message,
          color: AppColors.heart,
        ),
        const SizedBox(height: 4),
        Center(
          child: TextButton(onPressed: onRetry, child: const Text('Try again')),
        ),
      ],
    );
  }
}

class SecuritySectionTitle extends StatelessWidget {
  const SecuritySectionTitle({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppColors.primaryDark,
      ),
    );
  }
}
