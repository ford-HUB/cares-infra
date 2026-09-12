import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/app_permission_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Permissions landing, opened from the Profile tab. Lists the device
/// capabilities CARES uses and lets the person grant each one from here.
///
/// Toggling a permission on triggers the OS prompt. Permissions can't be
/// revoked from inside an app, so toggling one off (or re-enabling a blocked
/// one) hands off to the system app settings. Statuses are re-read when the
/// app comes back to the foreground so the list reflects whatever was changed
/// there.
class PermissionsScreen extends StatefulWidget {
  const PermissionsScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const PermissionsScreen()),
    );
  }

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen>
    with WidgetsBindingObserver {
  static const List<AppPermissionItem> _items = [
    AppPermissionItem(
      permission: Permission.locationWhenInUse,
      icon: Icons.location_on_outlined,
      label: 'Location',
      description:
          'Confirms you\'re at the event venue when checking in to attendance.',
    ),
    AppPermissionItem(
      permission: Permission.camera,
      icon: Icons.photo_camera_outlined,
      label: 'Camera',
      description: 'Face verification and taking a photo of your ID.',
    ),
    AppPermissionItem(
      permission: Permission.photos,
      icon: Icons.perm_media_outlined,
      label: 'Photos & media',
      description:
          'Choosing your profile photo and ID or proof-of-residency files.',
    ),
  ];

  final Map<Permission, AppPermissionState> _states = {};
  Permission? _busy;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    final entries = await Future.wait(
      _items.map((item) async {
        final status = await _statusOf(item.permission);
        return MapEntry(item.permission, permissionStateOf(status));
      }),
    );
    if (!mounted) return;
    setState(() {
      _states.addEntries(entries);
      _loading = false;
    });
  }

  Future<PermissionStatus> _statusOf(Permission permission) =>
      permission.status;

  Future<void> _toggle(AppPermissionItem item, bool enable) async {
    final state = _states[item.permission];
    if (!enable || state == AppPermissionState.blocked) {
      await _openSettings(item, revoking: !enable);
      return;
    }

    setState(() => _busy = item.permission);
    final status = await item.permission.request();
    if (!mounted) return;
    setState(() {
      _states[item.permission] = permissionStateOf(status);
      _busy = null;
    });

    if (status.isPermanentlyDenied || status.isRestricted) {
      _showMessage(
        '${item.label} access is blocked. Enable it in app settings.',
        action: SnackBarAction(
          label: 'Settings',
          textColor: Colors.white,
          onPressed: openAppSettings,
        ),
      );
    }
  }

  Future<void> _openSettings(
    AppPermissionItem item, {
    required bool revoking,
  }) async {
    final proceed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(revoking ? 'Turn off ${item.label}?' : 'Enable ${item.label}'),
        content: Text(
          revoking
              ? 'Permissions can only be turned off from your device\'s app '
                  'settings. We\'ll take you there now.'
              : '${item.label} access was blocked earlier. You can enable it '
                  'from your device\'s app settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Open settings'),
          ),
        ],
      ),
    );
    if (proceed == true) await openAppSettings();
  }

  void _showMessage(String text, {SnackBarAction? action}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        behavior: SnackBarBehavior.floating,
        action: action,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: () => Navigator.of(context).pop(),
            title: 'Permissions',
            subtitle:
                'Choose what CARES can access on this device. You can change '
                'these anytime.',
          ),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                    children: [
                      const Text(
                        'Device access',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryDark,
                        ),
                      ),
                      const SizedBox(height: 8),
                      for (final item in _items)
                        PermissionToggleTile(
                          item: item,
                          state: _states[item.permission] ??
                              AppPermissionState.notAllowed,
                          busy: _busy == item.permission,
                          onChanged: (value) => _toggle(item, value),
                        ),
                      const SizedBox(height: 24),
                      const SecurityInfoNote(
                        icon: Icons.shield_outlined,
                        text:
                            'Your location is only read while you check in to '
                            'an event, and photos are only accessed when you '
                            'pick one. Nothing is collected in the background.',
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
