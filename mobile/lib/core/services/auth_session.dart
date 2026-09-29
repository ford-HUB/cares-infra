/// In-memory auth session for the current app run.
class AuthSession {
  AuthSession._();

  static String? accessToken;

  /// Runs when the server stops honouring [accessToken] — the account was
  /// restricted, the device was signed out from the portal, or the token
  /// expired. Registered once by the app root, which owns navigation; the
  /// API client only reports the event.
  static void Function(String? message)? onSessionEnded;

  static bool get isSignedIn => accessToken != null && accessToken!.isNotEmpty;

  static void setAccessToken(String? token) {
    accessToken = token;
  }

  static void clear() {
    accessToken = null;
  }

  /// Drops the dead token and hands off to [onSessionEnded]. Several in-flight
  /// requests can all fail with 401 at once; only the first one gets through.
  static void notifySessionEnded(String? message) {
    if (!isSignedIn) return;
    clear();
    onSessionEnded?.call(message);
  }
}
