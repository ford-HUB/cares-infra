import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../domain/cares_event.dart';
import '../data/mock_location_checks.dart';

/// Runs the static "Check Location" flow: a short verifying state, then the
/// inside/outside-radius result taken from mock data.
///
/// Returns true when the participant is within the radius and chose to
/// continue to attendance verification.
Future<bool> runStaticLocationCheck(
  BuildContext context,
  CaresEvent event,
) async {
  while (true) {
    await _showVerifyingDialog(context);
    if (!context.mounted) return false;

    final distance = staticDistanceForEvent(event);
    final within = isWithinEventRadius(event);

    if (within) {
      final proceed = await _showWithinRadiusDialog(context, event, distance);
      return proceed;
    }

    final retry = await _showOutsideRadiusDialog(context, event, distance);
    if (!retry || !context.mounted) return false;
  }
}

/// Shows the non-dismissible "Verifying your location…" state for a moment,
/// then closes it again.
Future<void> _showVerifyingDialog(BuildContext context) async {
  final navigator = Navigator.of(context, rootNavigator: true);
  _openVerifyingDialog(context);
  await Future<void>.delayed(const Duration(milliseconds: 1600));
  if (navigator.canPop()) navigator.pop();
}

/// Opens the verifying dialog without awaiting its dismissal.
void _openVerifyingDialog(BuildContext context) {
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    useRootNavigator: true,
    builder: (_) => Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: const Padding(
        padding: EdgeInsets.fromLTRB(24, 28, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 44,
              height: 44,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            SizedBox(height: 20),
            Text(
              'Verifying your location…',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Checking how close you are to the event venue.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.45,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<bool> _showWithinRadiusDialog(
  BuildContext context,
  CaresEvent event,
  double distance,
) async {
  final proceed = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _ResultDialog(
      icon: Icons.my_location_rounded,
      color: AppColors.primary,
      title: 'Location Verified',
      message: 'You are within the event location radius.',
      detail:
          '${distance.round()}m from ${event.location} · radius '
          '${event.attendanceRadiusMeters.round()}m',
      primaryLabel: 'Verify Attendance',
      secondaryLabel: 'Close',
      onPrimary: () => Navigator.of(ctx).pop(true),
      onSecondary: () => Navigator.of(ctx).pop(false),
    ),
  );
  return proceed ?? false;
}

Future<bool> _showOutsideRadiusDialog(
  BuildContext context,
  CaresEvent event,
  double distance,
) async {
  final retry = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _ResultDialog(
      icon: Icons.location_off_rounded,
      color: AppColors.error,
      title: 'Outside Event Radius',
      message:
          'You are outside the event location radius. Please move closer to '
          'the event venue and try again.',
      detail:
          '${distance.round()}m from ${event.location} · you must be within '
          '${event.attendanceRadiusMeters.round()}m',
      primaryLabel: 'Try Again',
      secondaryLabel: 'Close',
      onPrimary: () => Navigator.of(ctx).pop(true),
      onSecondary: () => Navigator.of(ctx).pop(false),
    ),
  );
  return retry ?? false;
}

/// Confirmation shown once attendance has been recorded.
Future<void> showAttendanceVerifiedDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _ResultDialog(
      icon: Icons.verified_rounded,
      color: AppColors.primary,
      title: 'Attendance Verified',
      message:
          'Your attendance for this event has been recorded. Thank you for '
          'showing up!',
      primaryLabel: 'Done',
      onPrimary: () => Navigator.of(ctx).pop(),
    ),
  );
}

/// "Are you sure you want to cancel your participation in this event?"
Future<bool> showCancelParticipationDialog(
  BuildContext context,
  CaresEvent event,
) async {
  final cancelled = await showDialog<bool>(
    context: context,
    barrierDismissible: true,
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
                Icons.event_busy_rounded,
                size: 32,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Cancel Participation',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Are you sure you want to cancel your participation in this '
              'event?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 14),
            // Container(
            //   width: double.infinity,
            //   padding: const EdgeInsets.all(12),
            //   decoration: BoxDecoration(
            //     color: AppColors.background,
            //     borderRadius: BorderRadius.circular(12),
            //     border: Border.all(color: AppColors.inputFill),
            //   ),
            //   child: Column(
            //     crossAxisAlignment: CrossAxisAlignment.start,
            //     children: [
            //       Text(
            //         event.title,
            //         style: const TextStyle(
            //           fontSize: 14,
            //           fontWeight: FontWeight.w700,
            //           color: AppColors.textPrimary,
            //         ),
            //       ),
            //       const SizedBox(height: 4),
            //       Text(
            //         event.dateTimeLabel,
            //         style: const TextStyle(
            //           fontSize: 12.5,
            //           color: AppColors.textSecondary,
            //         ),
            //       ),
            //     ],
            //   ),
            // ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Keep Participation'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Cancel Participation'),
            ),
          ],
        ),
      ),
    ),
  );

  return cancelled ?? false;
}

class _ResultDialog extends StatelessWidget {
  const _ResultDialog({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
    required this.primaryLabel,
    required this.onPrimary,
    this.detail,
    this.secondaryLabel,
    this.onSecondary,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String message;
  final String? detail;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    return Dialog(
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
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: color),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            if (detail != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  detail!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 22),
            FilledButton(
              onPressed: onPrimary,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(primaryLabel),
            ),
            if (secondaryLabel != null) ...[
              const SizedBox(height: 6),
              TextButton(onPressed: onSecondary, child: Text(secondaryLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
