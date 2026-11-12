import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// What the app keeps between launches so a signed-in person reopens straight
/// onto their dashboard: the token every API call authenticates with, plus the
/// identity the dashboard was opened with at sign-in.
@immutable
class StoredSession {
  const StoredSession({
    required this.accessToken,
    required this.roleType,
    required this.email,
    this.firstName = '',
    this.lastName = '',
    this.hasInterests = false,
  });

  factory StoredSession.fromJson(Map<String, dynamic> json) {
    return StoredSession(
      accessToken: json['access_token'] as String? ?? '',
      roleType: json['role_type'] as String? ?? '',
      email: json['email'] as String? ?? '',
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      hasInterests: json['has_interests'] as bool? ?? false,
    );
  }

  final String accessToken;
  final String roleType;
  final String email;
  final String firstName;
  final String lastName;
  final bool hasInterests;

  /// Missing a token or a role there is nothing to restore onto.
  bool get isUsable => accessToken.isNotEmpty && roleType.isNotEmpty;

  /// The JWT's own `exp`. Null when the token cannot be read, in which case
  /// the server is left to decide.
  DateTime? get expiresAt => jwtExpiry(accessToken);

  /// True once the token is past `exp`. The server can end a session sooner
  /// (idle timeout, maximum length, device limit, a revoke from the portal);
  /// that is caught by the check against the server on launch.
  bool isExpiredAt(DateTime now) {
    final expiry = expiresAt;
    return expiry != null && !now.isBefore(expiry);
  }

  StoredSession copyWith({
    String? accessToken,
    String? email,
    String? firstName,
    String? lastName,
    bool? hasInterests,
  }) {
    return StoredSession(
      accessToken: accessToken ?? this.accessToken,
      roleType: roleType,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      hasInterests: hasInterests ?? this.hasInterests,
    );
  }

  Map<String, dynamic> toJson() => {
    'access_token': accessToken,
    'role_type': roleType,
    'email': email,
    'first_name': firstName,
    'last_name': lastName,
    'has_interests': hasInterests,
  };
}

/// Reads `exp` (seconds since epoch) from a JWT's payload. The signature is
/// not checked — the server does that on every request — this only spares a
/// network round trip for a token that is plainly out of date.
@visibleForTesting
DateTime? jwtExpiry(String token) {
  final parts = token.split('.');
  if (parts.length != 3) return null;
  try {
    final payload = jsonDecode(
      utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
    );
    if (payload is! Map) return null;
    final exp = payload['exp'];
    if (exp is! num) return null;
    return DateTime.fromMillisecondsSinceEpoch(
      (exp * 1000).toInt(),
      isUtc: true,
    );
  } catch (_) {
    return null;
  }
}

/// Keeps the [StoredSession] in the platform's secure store — the Android
/// Keystore-backed storage and the iOS Keychain — never in plain preferences.
///
/// Every call is best-effort: a store that cannot be read or written (no
/// plugin under test, a keystore reset by the OS) behaves as "no saved
/// session", which only means the person signs in again. Calls are queued so
/// a sign-out's delete can never land after the next sign-in's write.
class SessionStorage {
  SessionStorage._();

  static final SessionStorage instance = SessionStorage._();

  static const _sessionKey = 'auth.session';

  /// Plain-preferences marker that this install has run before. The iOS
  /// Keychain outlives an uninstall, so without it a reinstalled app would
  /// silently sign back in to the previous account.
  static const _installMarkerKey = 'auth.session.install_marker';

  static const _secure = FlutterSecureStorage(
    iOptions: IOSOptions(
      // Readable after the first unlock since boot (background sync needs
      // it) and never copied to another device through a backup.
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  Future<void> _queue = Future.value();

  Future<T> _enqueue<T>(Future<T> Function() task) {
    final result = _queue.then((_) => task());
    _queue = result.then<void>((_) {}, onError: (_) {});
    return result;
  }

  Future<StoredSession?> read() {
    return _enqueue(() async {
      try {
        if (!await _installSeenBefore()) {
          await _secure.delete(key: _sessionKey);
          return null;
        }
        final raw = await _secure.read(key: _sessionKey);
        if (raw == null || raw.isEmpty) return null;
        final decoded = jsonDecode(raw);
        if (decoded is! Map<String, dynamic>) return null;
        final session = StoredSession.fromJson(decoded);
        return session.isUsable ? session : null;
      } catch (error) {
        debugPrint('SessionStorage.read failed: $error');
        return null;
      }
    });
  }

  Future<void> write(StoredSession session) {
    return _enqueue(() async {
      try {
        await _secure.write(
          key: _sessionKey,
          value: jsonEncode(session.toJson()),
        );
        await _markInstallSeen();
      } catch (error) {
        debugPrint('SessionStorage.write failed: $error');
      }
    });
  }

  Future<void> clear() {
    return _enqueue(() async {
      try {
        await _secure.delete(key: _sessionKey);
      } catch (error) {
        debugPrint('SessionStorage.clear failed: $error');
      }
    });
  }

  Future<bool> _installSeenBefore() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_installMarkerKey) ?? false;
  }

  Future<void> _markInstallSeen() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_installMarkerKey, true);
  }
}
