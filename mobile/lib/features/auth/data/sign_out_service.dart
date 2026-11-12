import 'dart:async';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';

/// Ends the signed-in session on this device.
class SignOutService {
  SignOutService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// Sign-out should feel instant; the server call is a courtesy.
  static const _logoutTimeout = Duration(seconds: 5);

  /// The person chose to sign out: the server revokes this device's session
  /// (`POST /auth/logout`, so the token is dead even if a copy survived), then
  /// every local trace is wiped — the saved session included — so the next
  /// launch asks for credentials. Local sign-out never waits on, or fails
  /// with, the network.
  Future<void> signOut() async {
    if (AuthSession.isSignedIn) {
      try {
        await AuthSession.handlingSessionEnd(
          () => _api
              .postJson('/auth/logout', body: const {})
              .timeout(_logoutTimeout),
        );
      } catch (_) {
        // Offline or already ended server-side — nothing left to revoke here.
      }
    }
    clearLocalSession();
  }

  /// Clears the token, its saved copy, and the per-account state held in
  /// memory. Also used when the server ends the session on its own.
  static void clearLocalSession() {
    AuthSession.clear();
    StaticUserSession.instance.signOut();
    DonorSession.instance.signOut();
    RoleAccountStore.instance.clear();
    NotificationSync.instance.clear();
    LocalNotifications.instance.cancelAll();
  }
}
