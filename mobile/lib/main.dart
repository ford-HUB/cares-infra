import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/camera_bootstrap.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/app_flow.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';

/// Root navigator, reachable from outside the widget tree so a session that
/// dies mid-request can still be bounced to the login screen.
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<ScaffoldMessengerState> rootScaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await CameraBootstrap.preload();
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // Weather falls back gracefully when .env is missing.
  }
  AuthSession.onSessionEnded = _handleSessionEnded;
  runApp(const ProviderScope(child: CaresApp()));
}

/// The server refused a token it previously accepted: clear every in-memory
/// session, drop the whole navigation stack onto the login screen, and tell the
/// person why — the message is the server's own, e.g. "Session ended — please
/// sign in again".
void _handleSessionEnded(String? message) {
  StaticUserSession.instance.signOut();
  DonorSession.instance.signOut();
  RoleAccountStore.instance.clear();

  final navigator = rootNavigatorKey.currentState;
  if (navigator == null) return;

  navigator.pushAndRemoveUntil(
    MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
    (_) => false,
  );

  rootScaffoldMessengerKey.currentState
    ?..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        content: Text(
          message?.trim().isNotEmpty == true
              ? message!
              : 'Your session has ended — please sign in again.',
        ),
        duration: const Duration(seconds: 6),
      ),
    );
}

class CaresApp extends StatelessWidget {
  const CaresApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CARES',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      navigatorKey: rootNavigatorKey,
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      home: const AppFlow(),
    );
  }
}
