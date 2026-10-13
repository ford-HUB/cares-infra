import 'dart:convert';
import 'dart:math';

/// One linear ring of an event's attendance area, as drawn on the portal map.
typedef GeofenceRing = List<({double lat, double lng})>;

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

  /// Even-odd point-in-polygon across every ring, so holes and the separate
  /// parts of a MultiPolygon are both handled — the same rule the portal map
  /// and the gps-validator-service apply to the drawn boundary.
  static bool isInsideRings(
    List<GeofenceRing> rings, {
    required double latitude,
    required double longitude,
  }) {
    var inside = false;
    for (final ring in rings) {
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        final a = ring[i];
        final b = ring[j];
        final crosses =
            (a.lat > latitude) != (b.lat > latitude) &&
            longitude <
                (b.lng - a.lng) * (latitude - a.lat) / (b.lat - a.lat) + a.lng;
        if (crosses) inside = !inside;
      }
    }
    return inside;
  }

  /// Whether a position is inside an event's attendance area: the drawn
  /// boundary when there is one, otherwise [radiusMeters] around the venue.
  static bool isInsideEventArea({
    required double latitude,
    required double longitude,
    required List<GeofenceRing>? geofence,
    required double venueLatitude,
    required double venueLongitude,
    required double radiusMeters,
  }) {
    if (geofence != null && geofence.isNotEmpty) {
      return isInsideRings(geofence, latitude: latitude, longitude: longitude);
    }
    return distanceInMeters(
          fromLatitude: latitude,
          fromLongitude: longitude,
          toLatitude: venueLatitude,
          toLongitude: venueLongitude,
        ) <=
        radiusMeters;
  }

  /// Parses the server's `geofence` field: rings of `[lng, lat]` pairs.
  static List<GeofenceRing>? geofenceFromJson(Object? json) {
    if (json is! List) return null;
    final rings = <GeofenceRing>[
      for (final ring in json)
        if (ring is List)
          [
            for (final point in ring)
              if (point is List &&
                  point.length >= 2 &&
                  point[0] is num &&
                  point[1] is num)
                (
                  lat: (point[1] as num).toDouble(),
                  lng: (point[0] as num).toDouble(),
                ),
          ],
    ].where((ring) => ring.length >= 3).toList();
    return rings.isEmpty ? null : rings;
  }

  /// Back to the server's `[lng, lat]` ring shape, for persisting.
  static String? geofenceToJson(List<GeofenceRing>? geofence) =>
      geofence == null
      ? null
      : jsonEncode([
          for (final ring in geofence)
            [
              for (final p in ring) [p.lng, p.lat],
            ],
        ]);

  static List<GeofenceRing>? geofenceFromJsonString(String? source) {
    if (source == null || source.isEmpty) return null;
    try {
      return geofenceFromJson(jsonDecode(source));
    } on FormatException {
      return null;
    }
  }

  /// The average of the boundary's points — a stand-in venue when the event
  /// has an area but no pin.
  static ({double lat, double lng}) centroid(List<GeofenceRing> geofence) {
    final points = geofence.expand((ring) => ring).toList();
    final lat = points.fold(0.0, (sum, p) => sum + p.lat) / points.length;
    final lng = points.fold(0.0, (sum, p) => sum + p.lng) / points.length;
    return (lat: lat, lng: lng);
  }

  /// Furthest boundary point from the venue — the area's reach, shown as its
  /// radius wherever one number has to describe the drawn shape.
  static double reachMeters(
    List<GeofenceRing> geofence, {
    required double fromLatitude,
    required double fromLongitude,
  }) {
    var reach = 0.0;
    for (final p in geofence.expand((ring) => ring)) {
      reach = max(
        reach,
        distanceInMeters(
          fromLatitude: fromLatitude,
          fromLongitude: fromLongitude,
          toLatitude: p.lat,
          toLongitude: p.lng,
        ),
      );
    }
    return reach;
  }

  static double _toRadians(double degrees) => degrees * pi / 180;
}
