import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Geoapify credentials for the event route map, read from `mobile/.env`.
///
/// Used as the fallback basemap/router when `MapboxConfig` has no valid
/// token — the staff portal's event map runs on these same Geoapify tiles
/// (`site/src/constants/geoapify.ts`). Without a key the map falls back to
/// OpenStreetMap tiles and a straight-line route estimate.
class GeoapifyConfig {
  GeoapifyConfig._();

  static String get apiKey => dotenv.env['GEOAPIFY_API_KEY']?.trim() ?? '';

  static bool get isConfigured => apiKey.isNotEmpty;

  /// Same raster style as the portal's event map.
  static const String tileStyle = 'osm-bright';

  static String get tileUrlTemplate =>
      'https://maps.geoapify.com/v1/tile/$tileStyle/{z}/{x}/{y}.png'
      '?apiKey=$apiKey';

  static const String osmTileUrlTemplate =
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  static const String routingHost = 'api.geoapify.com';
  static const String routingPath = '/v1/routing';
}
