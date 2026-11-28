import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Unconfigured providers keep their button but skip the SDK (Facebook's would
/// crash).
class SocialAuthConfig {
  SocialAuthConfig._();

  /// Web client id: it is the ID token's `aud`, so it must match
  /// `GOOGLE_MOBILE_CLIENT_ID` in `server/.env`.
  static String get googleServerClientId =>
      dotenv.env['GOOGLE_SERVER_CLIENT_ID']?.trim() ?? '';

  static String get facebookAppId =>
      dotenv.env['FACEBOOK_APP_ID']?.trim() ?? '';

  static bool get isGoogleConfigured => googleServerClientId.isNotEmpty;

  static bool get isFacebookConfigured => facebookAppId.isNotEmpty;
}
