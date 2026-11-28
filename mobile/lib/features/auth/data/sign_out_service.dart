import 'dart:async';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/local_notifications.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';

class SignOutService {
  SignOutService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// Sign-out should feel instant; the server call is a courtesy.
  static const _logoutTimeout = Duration(seconds: 5);

  /// Revokes this device's session (`POST /auth/logout`), then wipes local
  /// state; never waits on or fails with the network.
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

  /// Also used when the server ends the session.
  static void clearLocalSession() {
    AuthSession.clear();
    StaticUserSession.instance.signOut();
    DonorSession.instance.signOut();
    RoleAccountStore.instance.clear();
    NotificationSync.instance.clear();
    LocalNotifications.instance.cancelAll();
  }
}
