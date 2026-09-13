import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/theme/app_theme.dart';
import '../domain/cares_event.dart';

/// Result of asking the device for location access before joining an event.
enum LocationPermissionOutcome {
  granted,
  denied,
  deniedForever,
  serviceDisabled,
  error,
}

class LocationPermissionResult {
  const LocationPermissionResult(this.outcome, this.message);

  final LocationPermissionOutcome outcome;
  final String message;

  bool get isGranted => outcome == LocationPermissionOutcome.granted;

  /// Denials the user cannot clear from the in-app prompt.
  bool get needsSettings =>
      outcome == LocationPermissionOutcome.deniedForever ||
      outcome == LocationPermissionOutcome.serviceDisabled;
}

/// Asks the device for location access (services + permission).
Future<LocationPermissionResult> requestEventLocationPermission() async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return const LocationPermissionResult(
        LocationPermissionOutcome.serviceDisabled,
        'Location services are turned off on this device. Turn them on to '
        'join this event.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    switch (permission) {
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        return const LocationPermissionResult(
          LocationPermissionOutcome.granted,
          'Location access granted.',
        );

      case LocationPermission.deniedForever:
        return const LocationPermissionResult(
          LocationPermissionOutcome.deniedForever,
          'Location access is permanently denied. Enable it for CARES in '
          'your device settings to join this event.',
        );

      case LocationPermission.denied:
      case LocationPermission.unableToDetermine:
        return const LocationPermissionResult(
          LocationPermissionOutcome.denied,
          'Location access was denied. CARES needs your location to confirm '
          'you can participate in this event.',
        );
    }
  } catch (_) {
    return const LocationPermissionResult(
      LocationPermissionOutcome.error,
      'We could not check your location permission. Please try again.',
    );
  }
}

/// Explains why location is needed before the device prompt is raised.
/// Returns true when the user chooses to allow location access.
Future<bool> showLocationPermissionRequestDialog(
  BuildContext context,
  CaresEvent event,
) async {
  final allow = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.location_on_rounded,
                size: 32,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Location Access Required',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'CARES needs access to your location to let you join '
              '${event.title}. Location permission is required to '
              'participate in this event.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.inputFill),
              ),
              child: const Column(
                children: [
                  _PermissionReason(
                    icon: Icons.place_outlined,
                    label: 'Confirms you can reach the event venue',
                  ),
                  SizedBox(height: 8),
                  _PermissionReason(
                    icon: Icons.how_to_reg_outlined,
                    label: 'Enables geolocation check-in on event day',
                  ),
                  SizedBox(height: 8),
                  _PermissionReason(
                    icon: Icons.lock_outline_rounded,
                    label: 'Used only for event attendance, never shared',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.inputFill),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Deny'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: () => Navigator.of(ctx).pop(true),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Allow Location Access'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );

  return allow ?? false;
}

/// What the user chose after a denied permission.
enum LocationDeniedAction { tryAgain, openSettings, cancel }

/// Explains that the event cannot be joined without location access.
Future<LocationDeniedAction> showLocationPermissionDeniedDialog(
  BuildContext context,
  LocationPermissionResult result,
) async {
  final action = await showDialog<LocationDeniedAction>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.location_off_rounded,
                size: 32,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Location Access Needed to Join',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '${result.message}\n\nYou have not been added to this event.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(
                result.needsSettings
                    ? LocationDeniedAction.openSettings
                    : LocationDeniedAction.tryAgain,
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                result.needsSettings ? 'Open Location Settings' : 'Try Again',
              ),
            ),
            const SizedBox(height: 10),
            if (result.needsSettings)
              TextButton(
                onPressed: () =>
                    Navigator.of(ctx).pop(LocationDeniedAction.tryAgain),
                child: const Text('I have enabled it — Try Again'),
              ),
            TextButton(
              onPressed: () =>
                  Navigator.of(ctx).pop(LocationDeniedAction.cancel),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    ),
  );

  return action ?? LocationDeniedAction.cancel;
}

class _PermissionReason extends StatelessWidget {
  const _PermissionReason({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12.5,
              height: 1.4,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }
}
