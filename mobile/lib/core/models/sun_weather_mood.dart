/// Weather mood mapped from OpenWeather conditions for the login sun widget.
enum SunWeatherMood {
  clear,
  cloudy,
  rainy,
}

/// Current weather snapshot for Cebu City.
class WeatherSnapshot {
  const WeatherSnapshot({
    required this.tempCelsius,
    required this.mood,
  });

  final double tempCelsius;
  final SunWeatherMood mood;

  String get tempLabel => '${tempCelsius.round()}°C';
}

SunWeatherMood moodFromOpenWeatherMain(String main) {
  switch (main) {
    case 'Rain':
    case 'Drizzle':
    case 'Thunderstorm':
      return SunWeatherMood.rainy;
    case 'Clear':
      return SunWeatherMood.clear;
    default:
      return SunWeatherMood.cloudy;
  }
}
