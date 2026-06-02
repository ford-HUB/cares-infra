import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static String get baseUrl {
    final value = dotenv.env['API_BASE_URL'];
    if (value == null || value.isEmpty) {
      throw StateError(
        'API_BASE_URL is not set. Copy .env.example to .env in the mobile folder.',
      );
    }
    return value.endsWith('/') ? value.substring(0, value.length - 1) : value;
  }
}
