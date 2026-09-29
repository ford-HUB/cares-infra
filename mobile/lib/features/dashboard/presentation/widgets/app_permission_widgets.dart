import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:mobile/core/theme/app_theme.dart';

/// A device capability the app asks for, shown as a row on the Permissions
/// screen. [permission] is the OS-level permission behind the toggle.
class AppPermissionItem {
  const AppPermissionItem({
    required this.permission,
    required this.icon,
    required this.label,
    required this.description,
  });

  final Permission permission;
  final IconData icon;
  final String label;
  final String description;
}

/// Simplified view of a [PermissionStatus] for the toggle + badge.
enum AppPermissionState { allowed, notAllowed, blocked }

AppPermissionState permissionStateOf(PermissionStatus status) {
  if (status.isGranted || status.isLimited || status.isProvisional) {
    return AppPermissionState.allowed;
  }
  if (status.isPermanentlyDenied || status.isRestricted) {
    return AppPermissionState.blocked;
  }
  return AppPermissionState.notAllowed;
}

/// Toggle row: icon, label, what the permission is used for, a small status
/// badge, and a switch. Same border language as [SecurityActionTile] so the
/// Permissions screen reads like the rest of Security & Privacy.
class PermissionToggleTile extends StatelessWidget {
  const PermissionToggleTile({
    super.key,
    required this.item,
    required this.state,
    required this.busy,
    required this.onChanged,
  });

  final AppPermissionItem item;
  final AppPermissionState state;
  final bool busy;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final allowed = state == AppPermissionState.allowed;

    return Container(
      margin: const EdgeInsets.only(bottom: 1),
      padding: const EdgeInsets.fromLTRB(14, 14, 8, 14),
      decoration: BoxDecoration(
        color: Colors.white,
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
              color: AppColors.accentLight.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, size: 20, color: AppColors.primaryDark),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        item.label,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusBadge(state: state),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  item.description,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.3,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          busy
              ? const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 18),
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
                )
              : Switch.adaptive(
                  value: allowed,
                  activeThumbColor: AppColors.primary,
                  onChanged: onChanged,
                ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.state});

  final AppPermissionState state;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (state) {
      AppPermissionState.allowed => ('Allowed', AppColors.primary),
      AppPermissionState.notAllowed => ('Off', AppColors.textMuted),
      AppPermissionState.blocked => ('Blocked', AppColors.accentOrange),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}
