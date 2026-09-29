import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Provider credentials for donor social sign-in, read from `mobile/.env`.
///
/// Both providers are optional at build time so the app is usable before the keys
/// exist. The `is*Configured` flags are what the UI checks: an unconfigured provider
/// keeps its button, but says it is not set up yet instead of calling into an SDK that
/// has nothing to authenticate with — which on Facebook's side would crash rather than
/// return an error.
class SocialAuthConfig {
  SocialAuthConfig._();

  /// The Google *web* client id. Android and iOS mint the ID token, but `aud` carries
  /// this value, and `aud` is what the server checks — so it must match
  /// `GOOGLE_MOBILE_CLIENT_ID` in `server/.env`.
  static String get googleServerClientId =>
      dotenv.env['GOOGLE_SERVER_CLIENT_ID']?.trim() ?? '';

  static String get facebookAppId =>
      dotenv.env['FACEBOOK_APP_ID']?.trim() ?? '';

  static bool get isGoogleConfigured => googleServerClientId.isNotEmpty;

  static bool get isFacebookConfigured => facebookAppId.isNotEmpty;
}
