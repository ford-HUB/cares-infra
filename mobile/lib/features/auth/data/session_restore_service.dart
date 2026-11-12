import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/session_storage.dart';

enum SessionRestoreStatus {
  /// Nothing saved — a first launch, or the person signed out last time.
  none,

  /// A session was saved but is no longer valid; the person signs in again.
  expired,

  /// The saved session is live again and the dashboard can open.
  restored,
}

@immutable
class SessionRestoreResult {
  const SessionRestoreResult._(this.status, {this.session, this.message});

  const SessionRestoreResult.none() : this._(SessionRestoreStatus.none);

  const SessionRestoreResult.expired(String message)
    : this._(SessionRestoreStatus.expired, message: message);

  const SessionRestoreResult.restored(StoredSession session)
    : this._(SessionRestoreStatus.restored, session: session);

  final SessionRestoreStatus status;
  final StoredSession? session;

  /// Why an [SessionRestoreStatus.expired] session ended, ready to show.
  final String? message;
}

/// Brings a saved session back on launch.
///
/// The token's own expiry is checked first, offline. A token that is still in
/// date is then confirmed against the server, because the server can end a
/// session long before `exp` — the security policy's idle timeout or maximum
/// length, the per-account device limit, or a sign-out from the portal.
class SessionRestoreService {
  SessionRestoreService({
    ApiClient? apiClient,
    SessionStorage? storage,
    DateTime Function()? clock,
  }) : _api = apiClient ?? ApiClient(),
       _storage = storage ?? SessionStorage.instance,
       _clock = clock ?? DateTime.now;

  final ApiClient _api;
  final SessionStorage _storage;
  final DateTime Function() _clock;

  /// Any authenticated mobile route would do; the profile is the one every
  /// mobile role can read, and it carries fresh names for the dashboard.
  static const _probePath = '/profile/me/mobile';

  /// Long enough for a slow connection, short enough not to hold the splash.
  static const _probeTimeout = Duration(seconds: 6);

  static const expiredMessage =
      'Your session has expired. Please sign in again.';

  Future<SessionRestoreResult> restore() async {
    final stored = await _storage.read();
    if (stored == null) return const SessionRestoreResult.none();

    if (stored.isExpiredAt(_clock().toUtc())) {
      AuthSession.clear();
      return const SessionRestoreResult.expired(expiredMessage);
    }

    AuthSession.resume(stored);

    try {
      final response = await AuthSession.handlingSessionEnd(
        () => _api.getJson(_probePath).timeout(_probeTimeout),
      );
      final refreshed = _refreshed(stored, response['data']);
      AuthSession.start(refreshed);
      return SessionRestoreResult.restored(refreshed);
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        // The server ended it; ApiClient already cleared the token.
        AuthSession.clear();
        return SessionRestoreResult.expired(
          error.message.trim().isEmpty ? expiredMessage : error.message,
        );
      }
      // Offline, server down, or any other refusal: the token is still in
      // date, so keep the person signed in. If the server has in fact ended
      // the session, the dashboard's first request gets the 401 and the app's
      // normal session-ended handling signs them out then.
      return SessionRestoreResult.restored(stored);
    } on TimeoutException {
      return SessionRestoreResult.restored(stored);
    }
  }

  /// Names and email as the server has them now, so a profile edited on
  /// another device shows correctly. The role stays as signed in with.
  StoredSession _refreshed(StoredSession stored, Object? data) {
    if (data is! Map<String, dynamic>) return stored;
    String? nonEmpty(Object? value) =>
        value is String && value.trim().isNotEmpty ? value : null;
    return stored.copyWith(
      email: nonEmpty(data['email']),
      firstName: nonEmpty(data['firstname']),
      lastName: nonEmpty(data['lastname']),
    );
  }
}
