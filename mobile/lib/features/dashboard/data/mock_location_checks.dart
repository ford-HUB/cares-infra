import '../domain/cares_event.dart';

/// Static distances (in metres) between the participant and each event venue.
/// The prototype's "Check Location" flow reads these instead of the device
/// GPS, so both the inside-radius and outside-radius results can be demoed.
const kMockLocationCheckDistances = <String, double>{
  'featured-1': 120, // within the 500m radius
  'featured-2': 1450, // outside the radius
  'upcoming-1': 85, // within
  'upcoming-2': 2300, // outside
  'upcoming-3': 310, // within
  'completed-1': 60, // within
  'completed-2': 95, // within
};

/// Distance used by the static location check for [event].
double staticDistanceForEvent(CaresEvent event) =>
    kMockLocationCheckDistances[event.id] ?? 250;

/// Whether the participant counts as being at the venue for [event].
bool isWithinEventRadius(CaresEvent event) =>
    staticDistanceForEvent(event) <= event.attendanceRadiusMeters;
