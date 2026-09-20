import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/features/dashboard/data/event_reminder_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

/// Arms the device reminders for a registered event from the person's
/// [EventReminderStore] preference: one the morning of their chosen lead day,
/// and one an hour before the start so the geofence check-in is not missed.
/// Re-syncing is idempotent — the same event always maps to the same two ids.
class EventReminderScheduler {
  EventReminderScheduler._();

  static final EventReminderScheduler instance = EventReminderScheduler._();

  /// Hour of the day the lead-time reminder lands on.
  static const int reminderHour = 8;

  static const Duration finalLead = Duration(hours: 1);

  /// Payload the tap handler recognises to open the event.
  static String payloadFor(CaresEvent event) => 'event:${event.id}';

  Future<void> sync(CaresEvent event) async {
    final ids = _idsFor(event.id);
    await cancel(event.id);

    final reminder = EventReminderStore.instance.reminderFor(event.id);
    if (!reminder.enabled) return;

    final start = event.startsAt;
    if (!start.isAfter(DateTime.now())) return;

    final leadDay = start.subtract(Duration(days: reminder.daysBefore));
    final leadAt = DateTime(
      leadDay.year,
      leadDay.month,
      leadDay.day,
      reminderHour,
    );
    await LocalNotifications.instance.schedule(
      id: ids.lead,
      at: leadAt,
      title: reminder.daysBefore == 1
          ? '${event.title} is tomorrow'
          : '${event.title} is in ${reminder.daysBefore} days',
      body:
          '${_when(start)} at ${event.location}. You are registered — attendance is tracked by geofence, and a no-show costs ranking points.',
      payload: payloadFor(event),
    );

    await LocalNotifications.instance.schedule(
      id: ids.hourBefore,
      at: start.subtract(finalLead),
      title: '${event.title} starts in an hour',
      body: 'Head to ${event.location} now so your check-in is recorded.',
      payload: payloadFor(event),
    );
  }

  Future<void> cancel(String eventId) async {
    final ids = _idsFor(eventId);
    await LocalNotifications.instance.cancel(ids.lead);
    await LocalNotifications.instance.cancel(ids.hourBefore);
  }

  /// Two stable 32-bit ids per event, well clear of the feed's id space.
  static ({int lead, int hourBefore}) _idsFor(String eventId) {
    final base = (eventId.hashCode & 0x0FFFFFFF) * 2;
    return (lead: base, hourBefore: base + 1);
  }

  static String _when(DateTime start) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final hour = start.hour % 12 == 0 ? 12 : start.hour % 12;
    final minute = start.minute.toString().padLeft(2, '0');
    final period = start.hour < 12 ? 'AM' : 'PM';
    return '${days[start.weekday - 1]} $hour:$minute $period';
  }
}
