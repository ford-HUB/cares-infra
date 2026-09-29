import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/app_entry_intro.dart';

/// Root flow: entry splash → login.
///
/// The splash is an opaque green curtain over the login screen. On exit it
/// slides straight up and off, revealing login already painted underneath —
/// a single transform on one opaque layer, which stays smooth where a
/// height-morph could not: that version had to guess the login header's height
/// and popped when the real header replaced it.
class AppFlow extends StatefulWidget {
  const AppFlow({super.key});

  @override
  State<AppFlow> createState() => _AppFlowState();
}

class _AppFlowState extends State<AppFlow> with TickerProviderStateMixin {
  /// Drives the intro itself.
  late final AnimationController _introController;

  /// Drives the curtain's exit.
  late final AnimationController _handoffController;

  late final Animation<double> _curtainSlide;

  bool _showLogin = false;
  bool _introDone = false;
  bool _assetsWarmed = false;

  @override
  void initState() {
    super.initState();
    // Both controllers exist before anything starts ticking — the intro's
    // completion listener reaches for the handoff one.
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    _handoffController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 850),
    );

    _curtainSlide = CurvedAnimation(
      parent: _handoffController,
      // Eases out of rest and accelerates away — a single continuous move
      // with no second beat to give the seam away.
      curve: Curves.easeInOutCubic,
    );

    _introController.addStatusListener((status) {
      if (status != AnimationStatus.completed || !mounted) return;
      // Build login first and let it lay out and decode for one frame, so the
      // cost of its first paint lands before the curtain starts moving.
      setState(() => _showLogin = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _handoffController.forward();
      });
    });

    _handoffController.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        // Curtain is off-screen — drop it so its painters stop ticking.
        setState(() => _introDone = true);
      }
    });

    _introController.forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_assetsWarmed) return;
    _assetsWarmed = true;
    // Decode the login header's photo while the splash is still playing;
    // otherwise that work lands on the first frame of the reveal.
    precacheImage(const AssetImage(AppAssets.loginEntryBanner), context);
  }

  @override
  void dispose() {
    _introController.dispose();
    _handoffController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Login sits underneath at full opacity — no fade, no transform, so
          // its own header animation plays exactly as designed and nothing
          // composites a full-screen layer during the slide.
          if (_showLogin) const LoginScreen(),

          if (!_introDone)
            SlideTransition(
              position: Tween<Offset>(
                begin: Offset.zero,
                end: const Offset(0, -1),
              ).animate(_curtainSlide),
              child: RepaintBoundary(
                child: IgnorePointer(
                  ignoring: _showLogin,
                  child: DecoratedBox(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.primaryDark,
                          AppColors.primary,
                          AppColors.secondary,
                        ],
                      ),
                    ),
                    child: AnimatedBuilder(
                      animation: _introController,
                      builder: (context, _) =>
                          AppEntryIntro(progress: _introController.value),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
