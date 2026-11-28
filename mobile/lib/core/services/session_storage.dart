import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

@immutable
class StoredSession {
  const StoredSession({
    required this.accessToken,
    required this.roleType,
    required this.email,
    this.firstName = '',
    this.lastName = '',
    this.hasInterests = false,
    this.unlockedRoles = const [],
  });

  factory StoredSession.fromJson(Map<String, dynamic> json) {
    return StoredSession(
      accessToken: json['access_token'] as String? ?? '',
      roleType: json['role_type'] as String? ?? '',
      email: json['email'] as String? ?? '',
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      hasInterests: json['has_interests'] as bool? ?? false,
      unlockedRoles: (json['unlocked_roles'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(),
    );
  }

  final String accessToken;
  final String roleType;
  final String email;
  final String firstName;
  final String lastName;
  final bool hasInterests;

  /// Other open sides (e.g. a student beneficiary's Volunteer side), reopened
  /// on restore.
  final List<String> unlockedRoles;

  bool get isUsable => accessToken.isNotEmpty && roleType.isNotEmpty;

  /// Null when unreadable; the server decides.
  DateTime? get expiresAt => jwtExpiry(accessToken);

  /// Server-side ends (idle, revoke, device limit) are caught by the launch
  /// check.
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
    List<String>? unlockedRoles,
  }) {
    return StoredSession(
      accessToken: accessToken ?? this.accessToken,
      roleType: roleType,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      hasInterests: hasInterests ?? this.hasInterests,
      unlockedRoles: unlockedRoles ?? this.unlockedRoles,
    );
  }

  Map<String, dynamic> toJson() => {
    'access_token': accessToken,
    'role_type': roleType,
    'email': email,
    'first_name': firstName,
    'last_name': lastName,
    'has_interests': hasInterests,
    'unlocked_roles': unlockedRoles,
  };
}

/// Signature unchecked; only skips a round trip for a plainly expired token.
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

/// Secure store (Keystore / Keychain). Best-effort: failures read as no saved
/// session. Calls are queued so a sign-out delete can't land after the next
/// sign-in write.
class SessionStorage {
  SessionStorage._();

  static final SessionStorage instance = SessionStorage._();

  static const _sessionKey = 'auth.session';

  /// The iOS Keychain survives uninstall; without this marker a reinstall would
  /// sign back in.
  static const _installMarkerKey = 'auth.session.install_marker';

  static const _secure = FlutterSecureStorage(
    iOptions: IOSOptions(
      // Readable after first unlock (background sync); never restored to
      // another device.
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
