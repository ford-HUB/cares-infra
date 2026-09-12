import 'package:flutter/material.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/account_security_service.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/connected_device_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Every session signed in to the account, reached from "See all devices"
/// on Account Security when more than the preview count are connected.
/// Resolves to the sessions still connected when the person goes back so
/// the landing preview stays in sync.
class ConnectedDevicesScreen extends StatefulWidget {
  const ConnectedDevicesScreen({super.key, required this.devices});

  final List<ConnectedDevice> devices;

  static Future<List<ConnectedDevice>?> open(
    BuildContext context, {
    required List<ConnectedDevice> devices,
  }) {
    return Navigator.of(context).push<List<ConnectedDevice>>(
      MaterialPageRoute<List<ConnectedDevice>>(
        builder: (_) => ConnectedDevicesScreen(devices: devices),
      ),
    );
  }

  @override
  State<ConnectedDevicesScreen> createState() => _ConnectedDevicesScreenState();
}

class _ConnectedDevicesScreenState extends State<ConnectedDevicesScreen> {
  late final List<ConnectedDevice> _devices = List.of(widget.devices);

  final AccountSecurityService _service = AccountSecurityService();
  final Set<String> _revoking = {};

  ConnectedDevice? get _current =>
      _devices.where((d) => d.isCurrent).firstOrNull;

  List<ConnectedDevice> get _others =>
      _devices.where((d) => !d.isCurrent).toList();

  Future<void> _signOutDevice(ConnectedDevice device) async {
    if (_revoking.contains(device.id)) return;
    if (!await confirmDeviceSignOut(context, device)) return;
    if (!mounted) return;
    setState(() => _revoking.add(device.id));
    try {
      await _service.revokeSession(device.id);
      if (!mounted) return;
      setState(() => _devices.removeWhere((d) => d.id == device.id));
      _showMessage('${device.name} signed out.');
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not sign out that device.');
    } finally {
      if (mounted) setState(() => _revoking.remove(device.id));
    }
  }

  Future<void> _signOutOthers() async {
    if (_others.isEmpty) return;
    try {
      final revoked = await _service.revokeOtherSessions();
      if (!mounted) return;
      setState(() => _devices.removeWhere((d) => !d.isCurrent));
      _showMessage(
        'Signed out of $revoked other device${revoked == 1 ? '' : 's'}.',
      );
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not sign out your other devices.');
    }
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final current = _current;
    final others = _others;

    return PopScope<List<ConnectedDevice>>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_devices);
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Column(
          children: [
            ProfileEditHeader(
              onBack: () => Navigator.of(context).pop(_devices),
              title: 'Connected devices',
              subtitle:
                  '${_devices.length} device${_devices.length == 1 ? '' : 's'} '
                  'signed in to your account. Sign out any you don\'t '
                  'recognise.',
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                children: [
                  if (current != null) ...[
                    const _GroupTitle(title: 'This device'),
                    const SizedBox(height: 8),
                    ConnectedDeviceTile(device: current, onSignOut: null),
                    const SizedBox(height: 20),
                  ],
                  Row(
                    children: [
                      _GroupTitle(title: 'Other devices (${others.length})'),
                      const Spacer(),
                      if (others.isNotEmpty)
                        TextButton(
                          onPressed: _signOutOthers,
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.heart,
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            visualDensity: VisualDensity.compact,
                            textStyle: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: const Text('Sign out all'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (others.isEmpty)
                    const SecurityInfoNote(
                      icon: Icons.check_circle_outline_rounded,
                      text: 'No other devices are signed in to your account.',
                      color: AppColors.secondary,
                    )
                  else
                    for (final device in others)
                      ConnectedDeviceTile(
                        device: device,
                        onSignOut: _revoking.contains(device.id)
                            ? null
                            : () => _signOutDevice(device),
                      ),
                  const SizedBox(height: 24),
                  const SecurityInfoNote(
                    icon: Icons.shield_outlined,
                    text:
                        'Don\'t recognise a device? Sign it out, then change '
                        'your password from Account Security.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupTitle extends StatelessWidget {
  const _GroupTitle({required this.title});

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
