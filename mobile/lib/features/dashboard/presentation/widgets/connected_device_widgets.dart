import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/account_security_models.dart';

/// A signed-in session as the list shows it: the server record with the
/// user agent and timestamps already turned into labels.
class ConnectedDevice {
  const ConnectedDevice({
    required this.id,
    required this.name,
    required this.platform,
    required this.location,
    required this.lastActive,
    this.isCurrent = false,
  });

  /// Reads the user agent for a name and platform. The app stamps
  /// `CARES-Mobile (android; ...)` on its requests; portal sessions carry a
  /// browser UA; anything else falls back to the source.
  factory ConnectedDevice.fromSession(AccountSession session) {
    final ua = session.userAgent ?? '';
    final lower = ua.toLowerCase();
    final isApp =
        lower.startsWith('cares-mobile') || session.source == 'MOBILE';

    final os = _detectOs(lower);
    final browser = isApp ? null : _detectBrowser(lower);

    final name = isApp
        ? 'CARES app${os != null ? ' on $os' : ''}'
        : '${browser ?? 'Browser'}${os != null ? ' on $os' : ''}';
    final platform = isApp
        ? '${os ?? 'Mobile'} · CARES app'
        : '${browser ?? 'Web'} · ${os ?? 'Portal'}';

    return ConnectedDevice(
      id: session.sessionId,
      name: name,
      platform: platform,
      location: session.ipAddress == 'unknown'
          ? 'Unknown location'
          : 'IP ${session.ipAddress}',
      lastActive: session.isCurrent
          ? 'Active now'
          : _humanise(session.lastSeenAt),
      isCurrent: session.isCurrent,
    );
  }

  final String id;
  final String name;

  /// e.g. "Android · CARES app", "Chrome · Windows".
  final String platform;
  final String location;

  /// Already humanised ("Active now", "2 hours ago").
  final String lastActive;
  final bool isCurrent;

  IconData get icon {
    final p = platform.toLowerCase();
    if (p.contains('android') || p.contains('ios')) {
      return Icons.smartphone_rounded;
    }
    if (p.contains('ipad') || p.contains('tablet')) {
      return Icons.tablet_mac_rounded;
    }
    return Icons.laptop_mac_rounded;
  }

  static String? _detectOs(String ua) {
    if (ua.contains('android')) return 'Android';
    if (ua.contains('iphone') || ua.contains('ios')) return 'iOS';
    if (ua.contains('ipad')) return 'iPad';
    if (ua.contains('windows')) return 'Windows';
    if (ua.contains('mac os') || ua.contains('macos')) return 'macOS';
    if (ua.contains('linux')) return 'Linux';
    return null;
  }

  static String? _detectBrowser(String ua) {
    if (ua.contains('edg/')) return 'Edge';
    if (ua.contains('opr/') || ua.contains('opera')) return 'Opera';
    if (ua.contains('chrome/')) return 'Chrome';
    if (ua.contains('firefox/')) return 'Firefox';
    if (ua.contains('safari/')) return 'Safari';
    return null;
  }

  static String _humanise(DateTime? at) {
    if (at == null) return 'Unknown';
    final diff = DateTime.now().difference(at.toLocal());
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) {
      return '${diff.inMinutes} minute${diff.inMinutes == 1 ? '' : 's'} ago';
    }
    if (diff.inDays < 1) {
      return '${diff.inHours} hour${diff.inHours == 1 ? '' : 's'} ago';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays} day${diff.inDays == 1 ? '' : 's'} ago';
    }
    final weeks = diff.inDays ~/ 7;
    return '$weeks week${weeks == 1 ? '' : 's'} ago';
  }
}

/// Confirm-then-signal dialog shared by the landing preview and the full list.
Future<bool> confirmDeviceSignOut(
  BuildContext context,
  ConnectedDevice device,
) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Sign out this device?'),
      content: Text(
        '${device.name} will be signed out of your account and will need '
        'your password to sign in again.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          style: TextButton.styleFrom(foregroundColor: AppColors.heart),
          child: const Text('Sign out'),
        ),
      ],
    ),
  );
  return confirmed == true;
}

/// "See all N devices" link under the truncated preview list.
class SeeAllDevicesLink extends StatelessWidget {
  const SeeAllDevicesLink({
    super.key,
    required this.total,
    required this.onTap,
  });

  final int total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'See all $total devices',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.expand_more_rounded,
                size: 18,
                color: AppColors.primary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One row in the connected devices list: platform icon, name, where and
/// when it was last seen, then either a "This device" badge or a sign-out
/// action.
class ConnectedDeviceTile extends StatelessWidget {
  const ConnectedDeviceTile({
    super.key,
    required this.device,
    required this.onSignOut,
  });

  final ConnectedDevice device;
  final VoidCallback? onSignOut;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 1),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.accentLight.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(device.icon, size: 20, color: AppColors.primaryDark),
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
                        device.name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    if (device.isCurrent) ...[
                      const SizedBox(width: 8),
                      const _ThisDeviceBadge(),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  device.platform,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.3,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(
                      device.isCurrent ? Icons.circle : Icons.schedule_rounded,
                      size: device.isCurrent ? 8 : 12,
                      color: device.isCurrent
                          ? AppColors.secondary
                          : AppColors.textMuted,
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        '${device.lastActive} · ${device.location}',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: device.isCurrent
                              ? FontWeight.w600
                              : FontWeight.w500,
                          color: device.isCurrent
                              ? AppColors.secondary
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (!device.isCurrent) ...[
            const SizedBox(width: 8),
            SizedBox(
              height: 32,
              child: OutlinedButton(
                onPressed: onSignOut,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.heart,
                  side: BorderSide(
                    color: AppColors.heart.withValues(alpha: 0.5),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  visualDensity: VisualDensity.compact,
                  textStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                child: const Text('Sign out'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ThisDeviceBadge extends StatelessWidget {
  const _ThisDeviceBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: AppDecorations.softBadge(),
      child: const Text(
        'This device',
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: AppColors.primaryDark,
        ),
      ),
    );
  }
}
