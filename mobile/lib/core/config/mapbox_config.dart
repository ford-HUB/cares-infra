import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Mapbox credentials for the event route map, read from `mobile/.env`.
///
/// Optional at build time: without a valid token the map falls back to
/// Geoapify (see `GeoapifyConfig`), then OpenStreetMap.
class MapboxConfig {
  MapboxConfig._();

  /// `PUB_MAPBOX_TOKEN` is the public (`pk.`) token meant for the bundled
  /// app; `MAPBOX_TOKEN` is accepted as a legacy fallback.
  static String get accessToken =>
      (dotenv.env['PUB_MAPBOX_TOKEN'] ?? dotenv.env['MAPBOX_TOKEN'])?.trim() ??
      '';

  /// Mapbox only accepts `pk.`/`sk.`-prefixed tokens; anything else gets a
  /// 401 and a blank map, so it is treated as unconfigured.
  static bool get isConfigured =>
      accessToken.startsWith('pk.') || accessToken.startsWith('sk.');

  static String get tileUrlTemplate =>
      'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/'
      '{z}/{x}/{y}@2x?access_token=$accessToken';

  static const String directionsHost = 'api.mapbox.com';
  static const String walkingDirectionsPath = '/directions/v5/mapbox/walking';
}
