import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/camera_bootstrap.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/app_flow.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  await CameraBootstrap.preload();
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // Weather falls back gracefully when .env is missing.
  }
  runApp(const ProviderScope(child: CaresApp()));
}

class CaresApp extends StatelessWidget {
  const CaresApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CARES',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const AppFlow(),
    );
  }
}
