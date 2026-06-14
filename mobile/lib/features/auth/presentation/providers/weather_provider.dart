import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/sun_weather_mood.dart';
import 'package:mobile/core/services/open_weather_service.dart';

final openWeatherServiceProvider = Provider<OpenWeatherService>(
  (ref) => OpenWeatherService(),
);

final weatherProvider = AsyncNotifierProvider<WeatherNotifier, WeatherSnapshot?>(
  WeatherNotifier.new,
);

class WeatherNotifier extends AsyncNotifier<WeatherSnapshot?> {
  @override
  Future<WeatherSnapshot?> build() {
    return ref.read(openWeatherServiceProvider).fetchCebuWeather();
  }
}
