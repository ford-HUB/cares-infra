import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../../../core/config/geoapify_config.dart';
import '../../../core/config/mapbox_config.dart';

/// A walking route from the volunteer to the event venue.
class EventRoute {
  const EventRoute({
    required this.points,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.isEstimate,
  });

  final List<LatLng> points;
  final double distanceMeters;
  final double durationSeconds;

  /// True when routing failed and the path is a straight line to the venue.
  final bool isEstimate;

  String get distanceLabel => distanceMeters >= 1000
      ? '${(distanceMeters / 1000).toStringAsFixed(1)} km'
      : '${distanceMeters.round()} m';

  String get durationLabel {
    final minutes = (durationSeconds / 60).ceil();
    if (minutes < 60) return '$minutes min';
    return '${minutes ~/ 60} h ${minutes % 60} min';
  }
}

/// Fetches a walking route from Mapbox Directions, falling back to Geoapify
/// Routing, using the keys in `mobile/.env`. Both are third-party services,
/// not the CARES server, so they are never proxied through ApiClient.
class EventRouteService {
  EventRouteService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _timeout = Duration(seconds: 12);

  Future<EventRoute> walkingRoute({
    required LatLng from,
    required LatLng to,
  }) async {
    if (MapboxConfig.isConfigured) {
      final route = await _mapboxRoute(from, to);
      if (route != null) return route;
    }
    if (GeoapifyConfig.isConfigured) {
      final route = await _geoapifyRoute(from, to);
      if (route != null) return route;
    }
    return _straightLine(from, to);
  }

  Future<EventRoute?> _mapboxRoute(LatLng from, LatLng to) async {
    try {
      final uri = Uri.https(
        MapboxConfig.directionsHost,
        '${MapboxConfig.walkingDirectionsPath}/'
        '${from.longitude},${from.latitude};${to.longitude},${to.latitude}',
        {
          'overview': 'full',
          'geometries': 'geojson',
          'access_token': MapboxConfig.accessToken,
        },
      );
      final response = await _client.get(uri).timeout(_timeout);
      if (response.statusCode != 200) return null;

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final routes = body['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) return null;

      final route = routes.first as Map<String, dynamic>;
      final coords =
          (route['geometry'] as Map<String, dynamic>)['coordinates']
              as List<dynamic>;
      final points = _toLatLngs(coords);
      if (points.length < 2) return null;

      return EventRoute(
        points: points,
        distanceMeters: (route['distance'] as num).toDouble(),
        durationSeconds: (route['duration'] as num).toDouble(),
        isEstimate: false,
      );
    } catch (_) {
      return null;
    }
  }

  Future<EventRoute?> _geoapifyRoute(LatLng from, LatLng to) async {
    try {
      // Geoapify waypoints are lat,lon pairs separated by '|'.
      final uri = Uri.https(
        GeoapifyConfig.routingHost,
        GeoapifyConfig.routingPath,
        {
          'waypoints':
              '${from.latitude},${from.longitude}|${to.latitude},${to.longitude}',
          'mode': 'walk',
          'apiKey': GeoapifyConfig.apiKey,
        },
      );
      final response = await _client.get(uri).timeout(_timeout);
      if (response.statusCode != 200) return null;

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final features = body['features'] as List<dynamic>?;
      if (features == null || features.isEmpty) return null;

      final feature = features.first as Map<String, dynamic>;
      final props = feature['properties'] as Map<String, dynamic>;
      final geometry = feature['geometry'] as Map<String, dynamic>;

      // Geometry is a MultiLineString (one line per leg); flatten it.
      final lines = geometry['type'] == 'LineString'
          ? [geometry['coordinates'] as List<dynamic>]
          : (geometry['coordinates'] as List<dynamic>).cast<List<dynamic>>();
      final points = [for (final line in lines) ..._toLatLngs(line)];
      if (points.length < 2) return null;

      return EventRoute(
        points: points,
        distanceMeters: (props['distance'] as num).toDouble(),
        durationSeconds: (props['time'] as num).toDouble(),
        isEstimate: false,
      );
    } catch (_) {
      return null;
    }
  }

  /// GeoJSON coordinates are [lon, lat].
  List<LatLng> _toLatLngs(List<dynamic> coords) => [
    for (final c in coords)
      LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()),
  ];

  EventRoute _straightLine(LatLng from, LatLng to) {
    final distance = const Distance().as(LengthUnit.Meter, from, to);
    // Rough walking pace of 1.4 m/s when no router is reachable or configured.
    return EventRoute(
      points: [from, to],
      distanceMeters: distance,
      durationSeconds: distance / 1.4,
      isEstimate: true,
    );
  }
}
