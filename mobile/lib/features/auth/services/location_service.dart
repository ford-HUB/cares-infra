import 'dart:convert';
import 'package:http/http.dart' as http;

class Location {
  final String code;
  final String name;
  final String type;

  const Location({required this.code, required this.name, required this.type});

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString().trim() ?? '',
      type: json['type']?.toString() ?? '',
    );
  }

  @override
  String toString() => name;
}

class LocationService {
  static const String baseUrl = 'https://psgc.cloud/api/v2';

  // Cebu Province
  static const String cebuProvinceCode = '0702200000';

  /// Loads all cities and municipalities in Cebu Province.
  static Future<List<Location>> getCebuCitiesMunicipalities() async {
    final uri = Uri.parse(
      '$baseUrl/provinces/$cebuProvinceCode/cities-municipalities',
    );

    try {
      final response = await http.get(uri);

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load Cebu cities/municipalities. '
          'Status: ${response.statusCode}',
        );
      }

      final decoded = jsonDecode(response.body);

      final dynamic items;

      if (decoded is List) {
        items = decoded;
      } else if (decoded is Map<String, dynamic>) {
        items = decoded['data'];
      } else {
        throw Exception('Unexpected PSGC response format');
      }

      if (items is! List) {
        throw Exception('No city/municipality data found');
      }

      final locations = items
          .whereType<Map<String, dynamic>>()
          .map((item) => Location.fromJson(item))
          .where(
            (location) => location.code.isNotEmpty && location.name.isNotEmpty,
          )
          .toList();

      // Add Cebu's three highly urbanized cities.
      final majorCities = await _getMajorCebuCities();

      for (final city in majorCities) {
        final alreadyExists = locations.any(
          (location) => location.code == city.code,
        );

        if (!alreadyExists) {
          locations.add(city);
        }
      }

      // Sort alphabetically.
      locations.sort(
        (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
      );

      return locations;
    } catch (e) {
      throw Exception('Cebu location lookup failed: $e');
    }
  }

  /// Gets Cebu City, Lapu-Lapu City, and Mandaue City.
  static Future<List<Location>> _getMajorCebuCities() async {
    const cityNames = ['Cebu City', 'Lapu-Lapu City', 'Mandaue City'];

    final List<Location> cities = [];

    for (final cityName in cityNames) {
      try {
        final encodedName = Uri.encodeComponent(cityName);

        final uri = Uri.parse('$baseUrl/cities-municipalities/$encodedName');

        final response = await http.get(uri);

        if (response.statusCode != 200) {
          continue;
        }

        final decoded = jsonDecode(response.body);

        dynamic item = decoded;

        if (decoded is Map<String, dynamic> && decoded['data'] != null) {
          item = decoded['data'];
        }

        if (item is Map<String, dynamic>) {
          final city = Location.fromJson(item);

          if (city.code.isNotEmpty && city.name.isNotEmpty) {
            cities.add(city);
          }
        }
      } catch (_) {
        // Continue loading the other cities if one lookup fails.
      }
    }

    return cities;
  }

  /// Loads barangays for the selected city or municipality.
  static Future<List<String>> getBarangays(String locationCode) async {
    final uri = Uri.parse(
      '$baseUrl/cities-municipalities/$locationCode/barangays',
    );

    try {
      final response = await http.get(uri);

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load barangays. '
          'Status: ${response.statusCode}',
        );
      }

      final decoded = jsonDecode(response.body);

      final dynamic items;

      if (decoded is List) {
        items = decoded;
      } else if (decoded is Map<String, dynamic>) {
        items = decoded['data'];
      } else {
        throw Exception('Unexpected PSGC response format');
      }

      if (items is! List) {
        throw Exception('No barangay data found');
      }

      return items
          .whereType<Map<String, dynamic>>()
          .map((item) => item['name']?.toString().trim() ?? '')
          .where((name) => name.isNotEmpty)
          .toList();
    } catch (e) {
      throw Exception('Barangay lookup failed: $e');
    }
  }
}
