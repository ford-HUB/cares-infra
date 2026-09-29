import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/core/models/sun_weather_mood.dart';

/// Fetches current weather from OpenWeather for Cebu City.
class OpenWeatherService {
  OpenWeatherService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const _cebuLat = 10.3157;
  static const _cebuLon = 123.8854;

  Future<WeatherSnapshot?> fetchCebuWeather() async {
    final apiKey = dotenv.env['OPENWEATHER_API_KEY']?.trim();
    if (apiKey == null || apiKey.isEmpty || apiKey == 'your_key_here') {
      return null;
    }

    final uri = Uri.https('api.openweathermap.org', '/data/2.5/weather', {
      'lat': '$_cebuLat',
      'lon': '$_cebuLon',
      'units': 'metric',
      'appid': apiKey,
    });

    try {
      final response = await _client
          .get(uri)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) return null;

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final main = data['main'] as Map<String, dynamic>?;
      final weather = data['weather'] as List<dynamic>?;
      if (main == null || weather == null || weather.isEmpty) return null;

      final temp = (main['temp'] as num?)?.toDouble();
      final conditionMain =
          (weather.first as Map<String, dynamic>)['main'] as String?;
      if (temp == null || conditionMain == null) return null;

      return WeatherSnapshot(
        tempCelsius: temp,
        mood: moodFromOpenWeatherMain(conditionMain),
      );
    } catch (_) {
      return null;
    }
  }
}
