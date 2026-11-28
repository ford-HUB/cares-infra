import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Fallback tiles/routing when Mapbox is unset; without a key, OSM tiles and a
/// straight-line route.
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
