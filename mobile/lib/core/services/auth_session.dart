import 'dart:async';

import 'package:mobile/core/services/session_storage.dart';

/// The signed-in session. The token lives in memory for this run and, through
/// [start], in [SessionStorage] so the next launch can pick it back up.
class AuthSession {
  AuthSession._();

  static String? accessToken;

  /// The identity saved alongside the token — what a restored launch opens
  /// the dashboard with. Null when nobody is signed in.
  static StoredSession? _current;

  /// Runs when the server stops honouring [accessToken] — the account was
  /// restricted, the device was signed out from the portal, or the token
  /// expired. Registered once by the app root, which owns navigation; the
  /// API client only reports the event.
  static void Function(String? message)? onSessionEnded;

  /// Set while a caller is handling a 401 itself (the launch check, the
  /// sign-out call) so a dead token there does not also bounce the app.
  static int _quietDepth = 0;

  static bool get isSignedIn => accessToken != null && accessToken!.isNotEmpty;

  /// Swaps the in-memory token only. The background location isolate uses
  /// this to receive the token from the app, and must not write the store.
  static void setAccessToken(String? token) {
    accessToken = token;
  }

  /// A completed sign-in: the token goes live now and is saved so the person
  /// stays signed in across restarts until they sign out or it expires.
  static void start(StoredSession session) {
    accessToken = session.accessToken;
    _current = session;
    unawaited(SessionStorage.instance.write(session));
  }

  /// Puts a session read back from the store live again, without rewriting it.
  static void resume(StoredSession session) {
    accessToken = session.accessToken;
    _current = session;
  }

  /// The server re-issued the token (e.g. after an email change): use and save
  /// the new one, keeping the rest of the saved session.
  static void replaceAccessToken(String token, {String? email}) {
    accessToken = token;
    final current = _current;
    if (current == null) return;
    final updated = current.copyWith(accessToken: token, email: email);
    _current = updated;
    unawaited(SessionStorage.instance.write(updated));
  }

  /// Ends the session on this device: forgets the token and wipes the saved
  /// copy, so the next launch lands on login.
  static void clear() {
    accessToken = null;
    _current = null;
    unawaited(SessionStorage.instance.clear());
  }

  /// Runs [body] with [onSessionEnded] held back; a 401 inside it still clears
  /// the session but leaves navigation to the caller.
  static Future<T> handlingSessionEnd<T>(Future<T> Function() body) async {
    _quietDepth++;
    try {
      return await body();
    } finally {
      _quietDepth--;
    }
  }

  /// Drops the dead token and hands off to [onSessionEnded]. Several in-flight
  /// requests can all fail with 401 at once; only the first one gets through.
  static void notifySessionEnded(String? message) {
    if (!isSignedIn) return;
    clear();
    if (_quietDepth > 0) return;
    onSessionEnded?.call(message);
  }
}
