import 'dart:async';

import 'package:mobile/core/services/session_storage.dart';

/// Token lives in memory and, via [start], in [SessionStorage].
class AuthSession {
  AuthSession._();

  static String? accessToken;

  static StoredSession? _current;

  /// Registered by the app root, which owns navigation; fired on restriction,
  /// portal sign-out or expiry.
  static void Function(String? message)? onSessionEnded;

  /// Non-zero while a caller handles its own 401 (launch check, sign-out).
  static int _quietDepth = 0;

  static bool get isSignedIn => accessToken != null && accessToken!.isNotEmpty;

  /// In-memory only: the background location isolate must not write the store.
  static void setAccessToken(String? token) {
    accessToken = token;
  }

  static void start(StoredSession session) {
    accessToken = session.accessToken;
    _current = session;
    unawaited(SessionStorage.instance.write(session));
  }

  /// Does not rewrite the store.
  static void resume(StoredSession session) {
    accessToken = session.accessToken;
    _current = session;
  }

  /// Server re-issued the token (e.g. after an email change).
  static void replaceAccessToken(String token, {String? email}) {
    accessToken = token;
    final current = _current;
    if (current == null) return;
    final updated = current.copyWith(accessToken: token, email: email);
    _current = updated;
    unawaited(SessionStorage.instance.write(updated));
  }

  static void clear() {
    accessToken = null;
    _current = null;
    unawaited(SessionStorage.instance.clear());
  }

  /// A 401 inside [body] still clears the session but leaves navigation to the
  /// caller.
  static Future<T> handlingSessionEnd<T>(Future<T> Function() body) async {
    _quietDepth++;
    try {
      return await body();
    } finally {
      _quietDepth--;
    }
  }

  /// Concurrent 401s: only the first one gets through.
  static void notifySessionEnded(String? message) {
    if (!isSignedIn) return;
    clear();
    if (_quietDepth > 0) return;
    onSessionEnded?.call(message);
  }
}
