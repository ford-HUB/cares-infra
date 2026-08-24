import 'dart:math';

/// Earth-radius distance helpers for event attendance verification.
class GeoUtils {
  GeoUtils._();

  static const double earthRadiusMeters = 6371000;

  static double distanceInMeters({
    required double fromLatitude,
    required double fromLongitude,
    required double toLatitude,
    required double toLongitude,
  }) {
    final lat1 = _toRadians(fromLatitude);
    final lat2 = _toRadians(toLatitude);
    final deltaLat = _toRadians(toLatitude - fromLatitude);
    final deltaLon = _toRadians(toLongitude - fromLongitude);

    final a =
        sin(deltaLat / 2) * sin(deltaLat / 2) +
        cos(lat1) * cos(lat2) * sin(deltaLon / 2) * sin(deltaLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  static double _toRadians(double degrees) => degrees * pi / 180;
}
