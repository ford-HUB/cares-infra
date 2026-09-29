import 'package:flutter/foundation.dart';

/// Device reminder preference for one event: on by default once the
/// volunteer registers, with a lead time they can change or switch off.
/// `EventReminderScheduler` turns it into scheduled notifications.
class EventReminder {
  const EventReminder({required this.enabled, required this.daysBefore});

  final bool enabled;

  /// How many days before the event starts the reminder fires.
  final int daysBefore;

  EventReminder copyWith({bool? enabled, int? daysBefore}) => EventReminder(
    enabled: enabled ?? this.enabled,
    daysBefore: daysBefore ?? this.daysBefore,
  );
}

/// In-memory reminder preferences keyed by event id. Reminders are scheduled
/// on the device, so nothing here needs the server.
class EventReminderStore extends ChangeNotifier {
  EventReminderStore._();

  static final EventReminderStore instance = EventReminderStore._();

  static const defaultDaysBefore = 1;
  static const leadTimeOptions = [1, 2, 3, 7];

  final Map<String, EventReminder> _reminders = {};

  EventReminder reminderFor(String eventId) =>
      _reminders[eventId] ??
      const EventReminder(enabled: true, daysBefore: defaultDaysBefore);

  void setEnabled(String eventId, bool enabled) {
    _reminders[eventId] = reminderFor(eventId).copyWith(enabled: enabled);
    notifyListeners();
  }

  void setDaysBefore(String eventId, int days) {
    _reminders[eventId] = reminderFor(eventId).copyWith(daysBefore: days);
    notifyListeners();
  }
}
