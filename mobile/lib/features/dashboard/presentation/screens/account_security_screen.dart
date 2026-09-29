import 'package:flutter/material.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/account_security_service.dart';
import 'package:mobile/features/dashboard/presentation/screens/change_password_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/connected_devices_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/update_email_otp_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/connected_device_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Account Security landing, opened from the Profile tab. Lists the sign-in
/// details that can be changed here — the email (guarded by an OTP sent to
/// the current address first) and the password — and the devices signed in
/// to the account from `GET /account/mobile/sessions`.
///
/// For an account that signs in through Google or Facebook, whatever its role,
/// both controls are disabled: the provider owns the address and there is no
/// password to change. The server refuses those calls too; this only keeps the
/// user from starting a flow that cannot finish.
class AccountSecurityScreen extends StatefulWidget {
  const AccountSecurityScreen({
    super.key,
    required this.email,
    this.usesSocialSignIn = false,
    this.signInProviderLabel = 'your sign-in provider',
  });

  /// The address currently used to sign in.
  final String email;

  /// True when the account has no password and at least one provider identity.
  final bool usesSocialSignIn;

  /// "Google", "Facebook", or "Google and Facebook" — used in the disabled hints.
  final String signInProviderLabel;

  static void open(
    BuildContext context, {
    required String email,
    bool usesSocialSignIn = false,
    String signInProviderLabel = 'your sign-in provider',
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AccountSecurityScreen(
          email: email,
          usesSocialSignIn: usesSocialSignIn,
          signInProviderLabel: signInProviderLabel,
        ),
      ),
    );
  }

  @override
  State<AccountSecurityScreen> createState() => _AccountSecurityScreenState();
}

class _AccountSecurityScreenState extends State<AccountSecurityScreen> {
  late String _email = widget.email;

  final AccountSecurityService _service = AccountSecurityService();

  List<ConnectedDevice> _devices = const [];
  bool _loadingDevices = true;
  String? _devicesError;

  /// Session ids with a revoke in flight, so a row cannot be tapped twice.
  final Set<String> _revoking = {};

  /// How many sessions the landing shows before handing off to the full list.
  static const _devicePreviewCount = 3;

  @override
  void initState() {
    super.initState();
    _loadDevices();
  }

  Future<void> _loadDevices() async {
    setState(() {
      _loadingDevices = true;
      _devicesError = null;
    });
    try {
      final sessions = await _service.listSessions();
      if (!mounted) return;
      setState(() {
        _devices = sessions.map(ConnectedDevice.fromSession).toList();
        _loadingDevices = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingDevices = false;
        _devicesError = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingDevices = false;
        _devicesError = 'Could not load your devices.';
      });
    }
  }

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

  Future<void> _openAllDevices() async {
    final remaining = await ConnectedDevicesScreen.open(
      context,
      devices: _devices,
    );
    if (!mounted || remaining == null) return;
    setState(() => _devices = remaining);
  }

  Future<void> _signOutOthers() async {
    if (!_devices.any((d) => !d.isCurrent)) return;
    try {
      final revoked = await _service.revokeOtherSessions();
      if (!mounted) return;
      setState(() => _devices = _devices.where((d) => d.isCurrent).toList());
      _showMessage(
        'Signed out of $revoked other device${revoked == 1 ? '' : 's'}.',
      );
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not sign out your other devices.');
    }
  }

  Future<void> _updateEmail() async {
    final updated = await UpdateEmailOtpScreen.open(
      context,
      currentEmail: _email,
    );
    if (!mounted || updated == null) return;
    setState(() => _email = updated);
    _showMessage('Email updated to $updated.');
  }

  Future<void> _changePassword() async {
    final changed = await ChangePasswordScreen.open(context);
    if (!mounted || changed != true) return;
    _showMessage('Password changed successfully.');
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final social = widget.usesSocialSignIn;
    final provider = widget.signInProviderLabel;
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: () => Navigator.of(context).pop(),
            title: 'Account Security',
            subtitle:
                'Manage the email and password you use to sign in to CARES.',
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              children: [
                SignInEmailCard(email: _email),
                const SizedBox(height: 24),
                const SecuritySectionTitle(title: 'Sign-in details'),
                const SizedBox(height: 8),
                if (social) ...[
                  SecurityInfoNote(
                    icon: Icons.info_outline_rounded,
                    text:
                        'You signed in with $provider. Your email and password '
                        'are managed there and can\'t be changed in CARES.',
                  ),
                  const SizedBox(height: 8),
                ],
                SecurityActionTile(
                  icon: Icons.alternate_email_rounded,
                  label: 'Update email',
                  hint: social
                      ? 'Managed by $provider.'
                      : 'We\'ll verify your current email with a code first.',
                  onTap: social ? null : _updateEmail,
                ),
                SecurityActionTile(
                  icon: Icons.password_rounded,
                  label: 'Change password',
                  hint: social
                      ? 'This account has no CARES password.'
                      : 'Requires your current password.',
                  onTap: social ? null : _changePassword,
                ),
                const SizedBox(height: 24),
                DevicesSectionHeader(
                  count: _devices.length,
                  onSignOutOthers: _devices.any((d) => !d.isCurrent)
                      ? _signOutOthers
                      : null,
                ),
                const SizedBox(height: 8),
                if (_loadingDevices)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                      ),
                    ),
                  )
                else if (_devicesError != null)
                  DevicesLoadError(
                    message: _devicesError!,
                    onRetry: _loadDevices,
                  )
                else ...[
                  for (final device in _devices.take(_devicePreviewCount))
                    ConnectedDeviceTile(
                      device: device,
                      onSignOut: _revoking.contains(device.id)
                          ? null
                          : () => _signOutDevice(device),
                    ),
                  if (_devices.length > _devicePreviewCount)
                    SeeAllDevicesLink(
                      total: _devices.length,
                      onTap: _openAllDevices,
                    ),
                ],
                const SizedBox(height: 24),
                if (!social)
                  const SecurityInfoNote(
                    icon: Icons.shield_outlined,
                    text:
                        'Changing your email or password signs you out of other '
                        'devices. You\'ll stay signed in on this one.',
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
