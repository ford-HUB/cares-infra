import '../domain/cares_event.dart';

/// The prototype's "Check Location" reads these instead of GPS so both radius
/// outcomes can be demoed.
const kMockLocationCheckDistances = <String, double>{
  'featured-1': 120, // within the 500m radius
  'featured-2': 1450, // outside the radius
  'upcoming-1': 85, // within
  'upcoming-2': 2300, // outside
  'upcoming-3': 310, // within
  'completed-1': 60, // within
  'completed-2': 95, // within
};

double staticDistanceForEvent(CaresEvent event) =>
    kMockLocationCheckDistances[event.id] ?? 250;

bool isWithinEventRadius(CaresEvent event) =>
    staticDistanceForEvent(event) <= event.attendanceRadiusMeters;
