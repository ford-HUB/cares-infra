import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/event_registration_store.dart';
import '../domain/cares_event.dart';

/// Bottom sheet showing where the volunteer stands for a joined event:
/// registration time, and whether they have timed in at the venue yet.
///
/// Returns true when the volunteer asked to check in now.
Future<bool> showEventStatusSheet(
  BuildContext context, {
  required CaresEvent event,
  required EventParticipation participation,
}) async {
  final checkIn = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _EventStatusSheet(
      event: event,
      participation: participation,
    ),
  );
  return checkIn ?? false;
}

class _EventStatusSheet extends StatelessWidget {
  const _EventStatusSheet({required this.event, required this.participation});

  final CaresEvent event;
  final EventParticipation participation;

  @override
  Widget build(BuildContext context) {
    final checkedIn = participation.attendanceVerified;
    final timeIn = participation.attendanceVerifiedAt;
    final color = checkedIn ? AppColors.primary : AppColors.accentOrange;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.inputFill,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    checkedIn
                        ? Icons.verified_rounded
                        : Icons.schedule_rounded,
                    size: 28,
                    color: color,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        checkedIn ? 'Checked In' : 'Not Checked In Yet',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        checkedIn
                            ? 'Your attendance at the venue is recorded.'
                            : 'Check in when you arrive at the venue.',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.inputFill),
              ),
              child: Column(
                children: [
                  _StatusRow(
                    icon: Icons.event_available_rounded,
                    label: 'Registered',
                    value: _formatDateTime(participation.registeredAt),
                  ),
                  const SizedBox(height: 12),
                  _StatusRow(
                    icon: Icons.login_rounded,
                    label: 'Time in',
                    value: timeIn == null ? '—' : _formatDateTime(timeIn),
                    valueColor: timeIn == null ? AppColors.textMuted : null,
                  ),
                  const SizedBox(height: 12),
                  _StatusRow(
                    icon: Icons.location_on_outlined,
                    label: 'Venue',
                    value: event.location,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (checkedIn)
              FilledButton(
                onPressed: () => Navigator.of(context).pop(false),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Done'),
              )
            else ...[
              FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(true),
                icon: const Icon(Icons.my_location_rounded),
                label: const Text('Check In Now'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Close'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _formatDateTime(DateTime dt) {
    final hour12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final suffix = dt.hour < 12 ? 'AM' : 'PM';
    return '${dt.month}/${dt.day}/${dt.year} · $hour12:$minute $suffix';
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        SizedBox(
          width: 82,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary,
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }
}
