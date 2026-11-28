import 'package:flutter_dotenv/flutter_dotenv.dart';

class MapboxConfig {
  MapboxConfig._();

  /// `MAPBOX_TOKEN` is a legacy fallback.
  static String get accessToken =>
      (dotenv.env['PUB_MAPBOX_TOKEN'] ?? dotenv.env['MAPBOX_TOKEN'])?.trim() ??
      '';

  /// Mapbox 401s (blank map) on tokens without a `pk.`/`sk.` prefix.
  static bool get isConfigured =>
      accessToken.startsWith('pk.') || accessToken.startsWith('sk.');

  static String get tileUrlTemplate =>
      'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/'
      '{z}/{x}/{y}@2x?access_token=$accessToken';

  static const String directionsHost = 'api.mapbox.com';
  static const String walkingDirectionsPath = '/directions/v5/mapbox/walking';
}
