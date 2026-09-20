import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_reminder_scheduler.dart';
import 'package:mobile/features/dashboard/data/event_reminder_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

/// Bottom sheet behind the bell on the event details screen: a switch for
/// the device reminder and a row of lead-time chips. Writes straight to
/// [EventReminderStore] so the bell updates as the user toggles.
Future<void> showEventReminderSheet(BuildContext context, CaresEvent event) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.white,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _ReminderSheet(event: event),
  );
}

class _ReminderSheet extends StatelessWidget {
  const _ReminderSheet({required this.event});

  final CaresEvent event;

  @override
  Widget build(BuildContext context) {
    final store = EventReminderStore.instance;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final reminder = store.reminderFor(event.id);
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.accentOrange.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.notifications_active_rounded,
                        color: AppColors.accentOrange,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Event reminder',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF1B1F24),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'A notification on this phone before the event starts.',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: reminder.enabled,
                      activeTrackColor: AppColors.accentOrange,
                      onChanged: (v) {
                        store.setEnabled(event.id, v);
                        EventReminderScheduler.instance.sync(event);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 160),
                  opacity: reminder.enabled ? 1 : 0.4,
                  child: IgnorePointer(
                    ignoring: !reminder.enabled,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Remind me',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1B1F24),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final days
                                in EventReminderStore.leadTimeOptions)
                              _LeadChip(
                                days: days,
                                selected: reminder.daysBefore == days,
                                onTap: () {
                                  store.setDaysBefore(event.id, days);
                                  EventReminderScheduler.instance.sync(event);
                                },
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _summary(reminder, event),
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF6B7280),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF1B1F24),
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text('Done'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  static String _summary(EventReminder reminder, CaresEvent event) {
    if (!reminder.enabled) return 'Reminders are off for this event.';
    final sendOn = event.date.subtract(Duration(days: reminder.daysBefore));
    final when = reminder.daysBefore == 1
        ? '1 day before'
        : '${reminder.daysBefore} days before';
    return 'Pops $when, on ${sendOn.month}/${sendOn.day}/${sendOn.year} at ${EventReminderScheduler.reminderHour}:00 AM, plus a final nudge an hour before the start.';
  }
}

class _LeadChip extends StatelessWidget {
  const _LeadChip({
    required this.days,
    required this.selected,
    required this.onTap,
  });

  final int days;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = days == 7 ? '1 week' : '$days day${days == 1 ? '' : 's'}';
    return Material(
      color: selected ? AppColors.accentOrange : const Color(0xFFF3F4F6),
      borderRadius: BorderRadius.circular(AppColors.pillRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : const Color(0xFF1B1F24),
            ),
          ),
        ),
      ),
    );
  }
}
