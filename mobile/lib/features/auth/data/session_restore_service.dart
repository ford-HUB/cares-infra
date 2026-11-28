import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/session_storage.dart';

enum SessionRestoreStatus {
  none,

  expired,

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

  final String? message;
}

/// Checks `exp` offline, then confirms with the server, which can end a session
/// earlier (idle timeout, max length, device limit, portal sign-out).
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

  /// Readable by every mobile role and carries fresh names.
  static const _probePath = '/profile/me/mobile';

  /// Short enough not to hold the splash.
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
      // Offline or other failure: keep the in-date session; a real 401 later
      // goes through normal session-ended handling.
      return SessionRestoreResult.restored(stored);
    } on TimeoutException {
      return SessionRestoreResult.restored(stored);
    }
  }

  /// Picks up profile edits from other devices; the role is kept.
  StoredSession _refreshed(StoredSession stored, Object? data) {
    if (data is! Map<String, dynamic>) return stored;
    String? nonEmpty(Object? value) =>
        value is String && value.trim().isNotEmpty ? value : null;
    final unlocked = data['unlocked_roles'];
    return stored.copyWith(
      email: nonEmpty(data['email']),
      firstName: nonEmpty(data['firstname']),
      lastName: nonEmpty(data['lastname']),
      unlockedRoles: unlocked is List
          ? unlocked.whereType<String>().toList()
          : null,
    );
  }
}
