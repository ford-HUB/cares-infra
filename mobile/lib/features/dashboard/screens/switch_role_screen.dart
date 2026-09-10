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
      builder: (ctx) =>
          _SwitchRoleConfirmDialog(fromRole: _session.activeRole, toRole: role),
    );

    if (confirmed != true || !mounted) return;

    // Grab the messenger before popping — the snackbar is shown by the new
    // role's dashboard, not by this screen.
    final messenger = ScaffoldMessenger.of(context);
    _session.switchTo(role);
    Navigator.of(context).pop(role);

    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: role.accentColor,
        content: Row(
          children: [
            Icon(role.icon, size: 18, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'You are now using CARES as a ${role.label.toLowerCase()}.',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
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

/// Confirmation shown before the active role changes. Spells out where the
/// user is going and reassures them that nothing from the current role is lost.
class _SwitchRoleConfirmDialog extends StatelessWidget {
  const _SwitchRoleConfirmDialog({
    required this.fromRole,
    required this.toRole,
  });

  final AppRole fromRole;
  final AppRole toRole;

  List<_ConfirmPoint> get _points => [
    _ConfirmPoint(
      icon: Icons.dashboard_customize_outlined,
      text:
          'Your ${toRole.label.toLowerCase()} dashboard, navigation, and '
          'features will load right away.',
    ),
    _ConfirmPoint(
      icon: Icons.lock_outline_rounded,
      text:
          'Your ${fromRole.label.toLowerCase()} ${_dataLabelFor(fromRole)} '
          'stay saved on this account.',
    ),
    const _ConfirmPoint(
      icon: Icons.swap_horiz_rounded,
      text: 'Switch back any time from Profile → Account → Switch Role.',
    ),
  ];

  static String _dataLabelFor(AppRole role) => switch (role) {
    AppRole.volunteer => 'events, activity, and ranks',
    AppRole.beneficiary => 'requests and assistance history',
    AppRole.donor => 'donations and giving history',
  };

  @override
  Widget build(BuildContext context) {
    final accent = toRole.accentColor;

    return Dialog(
      backgroundColor: AppColors.background,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _RoleTransition(fromRole: fromRole, toRole: toRole),
            const SizedBox(height: 18),
            Text(
              'Switch to ${toRole.label}?',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Same account — only the role you are using changes.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                color: AppColors.secondary.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.fieldBorder),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < _points.length; i++) ...[
                    if (i > 0) const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(_points[i].icon, size: 17, color: accent),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _points[i].text,
                            style: const TextStyle(
                              fontSize: 12.5,
                              height: 1.4,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primaryDark,
                      side: const BorderSide(color: AppColors.borderCard),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Stay here'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),

                    label: Text('Switch to ${toRole.label}'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ConfirmPoint {
  const _ConfirmPoint({required this.icon, required this.text});

  final IconData icon;
  final String text;
}

/// "Current role → new role" header of the confirmation dialog.
class _RoleTransition extends StatelessWidget {
  const _RoleTransition({required this.fromRole, required this.toRole});

  final AppRole fromRole;
  final AppRole toRole;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _RoleBadge(role: fromRole, caption: 'Current', emphasized: false),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Icon(
            Icons.arrow_forward_rounded,
            size: 22,
            color: AppColors.textMuted,
          ),
        ),
        _RoleBadge(role: toRole, caption: 'Switching to', emphasized: true),
      ],
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({
    required this.role,
    required this.caption,
    required this.emphasized,
  });

  final AppRole role;
  final String caption;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final accent = role.accentColor;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: emphasized ? accent : accent.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(16),
            border: emphasized
                ? null
                : Border.all(color: accent.withValues(alpha: 0.3)),
          ),
          child: Icon(
            role.icon,
            size: 26,
            color: emphasized ? Colors.white : accent,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          role.label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: emphasized ? accent : AppColors.primaryDark,
          ),
        ),
        Text(
          caption,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
      ],
    );
  }
}
