import 'package:flutter/foundation.dart';

/// Email reminder preference for one event: on by default once the
/// volunteer registers, with a lead time they can change or switch off.
class EventReminder {
  const EventReminder({required this.enabled, required this.daysBefore});

  final bool enabled;

  /// How many days before the event starts the email goes out.
  final int daysBefore;

  EventReminder copyWith({bool? enabled, int? daysBefore}) => EventReminder(
    enabled: enabled ?? this.enabled,
    daysBefore: daysBefore ?? this.daysBefore,
  );
}

/// In-memory reminder preferences for the static prototype phase, keyed by
/// event id. The server does not expose a reminder endpoint yet, so this
/// holds what the UI would send it.
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
