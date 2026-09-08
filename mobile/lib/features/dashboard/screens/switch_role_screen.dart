import 'package:flutter/material.dart';
import 'package:mobile/core/session/app_role.dart';
import 'package:mobile/core/session/role_session.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Profile → Account → Switch Role.
///
/// Lists every role the account is registered or authorized for and switches
/// the active one. Data from the other roles is kept — switching back restores
/// the same events, requests, and donations.
class SwitchRoleScreen extends StatefulWidget {
  const SwitchRoleScreen({super.key});

  static Future<AppRole?> open(BuildContext context) {
    return Navigator.of(context).push<AppRole>(
      MaterialPageRoute<AppRole>(builder: (_) => const SwitchRoleScreen()),
    );
  }

  @override
  State<SwitchRoleScreen> createState() => _SwitchRoleScreenState();
}

class _SwitchRoleScreenState extends State<SwitchRoleScreen> {
  final _session = RoleSession.instance;

  Future<void> _select(AppRole role) async {
    if (role == _session.activeRole) {
      Navigator.of(context).pop();
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.background,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(
          'Switch to ${role.label}?',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: AppColors.primaryDark,
          ),
        ),
        content: Text(
          'CARES will load your ${role.label.toLowerCase()} dashboard. Your '
          '${_session.activeRole.label.toLowerCase()} data stays saved on this '
          'account and is here when you switch back.',
          style: const TextStyle(
            fontSize: 13,
            height: 1.45,
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Switch'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // Grab the messenger before popping — the snackbar is shown by the new
    // role's dashboard, not by this screen.
    final messenger = ScaffoldMessenger.of(context);
    _session.switchTo(role);
    Navigator.of(context).pop(role);

    messenger.showSnackBar(
      SnackBar(
        content: Text('Switched to ${role.label}.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final roles = _session.availableRoles.toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        foregroundColor: AppColors.primaryDark,
        title: const Text(
          'Change Role',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Text(
            'One account, ${roles.length} role${roles.length == 1 ? '' : 's'}. '
            'Pick the role you want to use — your information for the other '
            'roles is kept as it is.',
            style: TextStyle(
              fontSize: 13,
              height: 1.45,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 18),
          for (final role in roles) ...[
            _RoleCard(
              role: role,
              isActive: role == _session.activeRole,
              onTap: () => _select(role),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Only the roles your account is registered or authorized '
                    'for are listed here.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.45,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
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

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.role,
    required this.isActive,
    required this.onTap,
  });

  final AppRole role;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = role.accentColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive ? accent : AppColors.fieldBorder,
              width: isActive ? 1.6 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(role.icon, size: 22, color: accent),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          role.label,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        if (isActive) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              'Current',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: accent,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      role.description,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                isActive
                    ? Icons.check_circle_rounded
                    : Icons.chevron_right_rounded,
                size: isActive ? 22 : 20,
                color: isActive ? accent : AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
