enum SunWeatherMood { clear, cloudy, rainy }

class WeatherSnapshot {
  const WeatherSnapshot({required this.tempCelsius, required this.mood});

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

/// 0 = mild, 1 = harshest; drives cloud grayness on non-clear days.
double weatherDiscomfortFromTemp(double tempCelsius, SunWeatherMood mood) {
  if (mood == SunWeatherMood.clear) return 0;

  // Cebu comfort band ~24–30 °C.
  final heatStress = ((tempCelsius - 30) / 10).clamp(0.0, 1.0);
  final coolStress = ((24 - tempCelsius) / 8).clamp(0.0, 1.0);
  final tempStress = heatStress > coolStress ? heatStress : coolStress;

  final moodBase = switch (mood) {
    SunWeatherMood.cloudy => 0.3,
    SunWeatherMood.rainy => 0.55,
    SunWeatherMood.clear => 0.0,
  };

  return (moodBase + tempStress * 0.45).clamp(0.0, 1.0);
}
