/// In-memory auth session for the current app run.
class AuthSession {
  AuthSession._();

  static String? accessToken;

  static void setAccessToken(String? token) {
    accessToken = token;
  }

  static void clear() {
    accessToken = null;
  }
}
