import 'package:flutter/material.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/app_entry_intro.dart';

/// Root flow: entry splash → login.
class AppFlow extends StatefulWidget {
  const AppFlow({super.key});

  @override
  State<AppFlow> createState() => _AppFlowState();
}

class _AppFlowState extends State<AppFlow> with TickerProviderStateMixin {
  bool _showLogin = false;
  late final AnimationController _introController;

  @override
  void initState() {
    super.initState();
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..forward();
    _introController.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        setState(() => _showLogin = true);
      }
    });
  }

  @override
  void dispose() {
    _introController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 700),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.06),
              end: Offset.zero,
            ).animate(animation),
            child: child,
          ),
        );
      },
      child: _showLogin
          ? const LoginScreen(key: ValueKey('login'))
          : ColoredBox(
              key: const ValueKey('entry'),
              color: Colors.white,
              child: Center(
                child: AnimatedBuilder(
                  animation: _introController,
                  builder: (context, _) => AppEntryIntro(
                    progress: _introController.value,
                  ),
                ),
              ),
            ),
    );
  }
}
