import 'package:flutter/material.dart';
import 'package:mobile/core/services/camera_bootstrap.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/app_flow.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await CameraBootstrap.preload();
  runApp(const CaresApp());
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
