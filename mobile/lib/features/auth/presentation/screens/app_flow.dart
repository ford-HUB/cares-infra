import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/app_entry_intro.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_slides.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_story.dart';

/// Root flow: entry splash → leading story → login.
///
/// Three opaque layers stacked bottom to top: login, the leading story, and
/// the splash curtain. Each hand-off is a single vertical slide of one layer,
/// revealing the next one already painted underneath — one transform on one
/// opaque layer stays smooth where a height-morph could not.
///
/// Once on login, dragging its header down pulls the story back over it from
/// the top, opened on its last beat so it can be rolled back to the first.
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

  /// Where the leading story sits: 0 covers the screen, 1 is fully off the
  /// top. Driven by animations for Continue and directly by the finger when
  /// pulled down from login.
  late final AnimationController _leadingController;

  GlobalKey<LeadingStoryState> _leadingKey = GlobalKey<LeadingStoryState>();
  int _leadingStartIndex = 0;

  bool _showLeading = false;
  bool _showLogin = false;
  bool _introDone = false;
  bool _assetsWarmed = false;

  static const Duration _slideDuration = Duration(milliseconds: 850);

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
      duration: _slideDuration,
    );
    _leadingController = AnimationController(
      vsync: this,
      duration: _slideDuration,
    );

    _curtainSlide = CurvedAnimation(
      parent: _handoffController,
      // Eases out of rest and accelerates away — a single continuous move
      // with no second beat to give the seam away.
      curve: Curves.easeInOutCubic,
    );

    _introController.addStatusListener((status) {
      if (status != AnimationStatus.completed || !mounted) return;
      // Build the story first and let it lay out for one frame, so the cost of
      // its first paint lands before the curtain starts moving.
      setState(() => _showLeading = true);
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
    // Decode the story photos and the login header's photo while the splash
    // is still playing; otherwise that work lands on the first reveal frame.
    precacheLeadingSlides(context);
    precacheImage(const AssetImage(AppAssets.loginEntryBanner), context);
  }

  @override
  void dispose() {
    _introController.dispose();
    _handoffController.dispose();
    _leadingController.dispose();
    super.dispose();
  }

  /// Continue on the last beat, or Skip: slide the story up and off.
  void _dismissLeading() {
    if (!_showLogin) {
      // First hand-off: build login underneath and give it a frame to lay
      // out, same as the splash does for the story.
      setState(() => _showLogin = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _slideLeadingTo(1, curve: Curves.easeInOutCubic);
      });
      return;
    }
    _slideLeadingTo(1, curve: Curves.easeInOutCubic);
  }

  void _slideLeadingTo(double target, {Curve curve = Curves.easeOutCubic}) {
    final distance = (_leadingController.value - target).abs();
    _leadingController
        .animateTo(
          target,
          curve: curve,
          duration: _slideDuration * distance.clamp(0.35, 1.0),
        )
        .then((_) {
          // Fully gone: unmount so the photo drift stops ticking.
          if (mounted && target == 1) setState(() => _showLeading = false);
        });
  }

  void _onPullStart(DragStartDetails _) {
    _leadingController.stop();
    if (_showLeading) return;
    setState(() {
      // A fresh story each pull, opened on its last beat.
      _leadingKey = GlobalKey<LeadingStoryState>();
      _leadingStartIndex = leadingSlides.length - 1;
      _leadingController.value = 1;
      _showLeading = true;
    });
  }

  void _onPullUpdate(DragUpdateDetails details) {
    final height = MediaQuery.sizeOf(context).height;
    _leadingController.value -= details.primaryDelta! / height;
  }

  void _onPullEnd(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0;
    final open =
        velocity > 700 || (velocity > -700 && _leadingController.value < 0.6);
    _slideLeadingTo(open ? 0 : 1);
  }

  /// System back while the story is up steps back a beat; on the first beat
  /// it returns to login if there is one, otherwise leaves the app.
  void _onSystemBack(bool didPop, Object? _) {
    if (didPop) return;
    if (_leadingKey.currentState?.goBack() ?? false) return;
    if (_showLogin) {
      _dismissLeading();
    } else {
      SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_showLeading,
      onPopInvokedWithResult: _onSystemBack,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // Login sits underneath at full opacity — no fade, no transform,
            // so its own header animation plays exactly as designed.
            if (_showLogin)
              LoginScreen(
                onHeaderPullStart: _onPullStart,
                onHeaderPullUpdate: _onPullUpdate,
                onHeaderPullEnd: _onPullEnd,
              ),

            if (_showLeading) _buildLeading(),

            if (!_introDone) _buildCurtain(),
          ],
        ),
      ),
    );
  }

  Widget _buildLeading() {
    return SlideTransition(
      position: Tween<Offset>(
        begin: Offset.zero,
        end: const Offset(0, -1),
      ).animate(_leadingController),
      child: AnimatedBuilder(
        animation: _leadingController,
        // Corners round off as the story lifts, so its leading edge reads as
        // a sheet moving over login rather than a hard seam.
        builder: (context, child) {
          final lift = (_leadingController.value * 6).clamp(0.0, 1.0);
          if (lift == 0) return child!;
          return ClipRRect(
            borderRadius: BorderRadius.vertical(
              bottom: Radius.circular(32 * lift),
            ),
            child: child,
          );
        },
        child: RepaintBoundary(
          child: LeadingStory(
            key: _leadingKey,
            initialIndex: _leadingStartIndex,
            onFinished: _dismissLeading,
          ),
        ),
      ),
    );
  }

  Widget _buildCurtain() {
    return SlideTransition(
      position: Tween<Offset>(
        begin: Offset.zero,
        end: const Offset(0, -1),
      ).animate(_curtainSlide),
      child: RepaintBoundary(
        child: IgnorePointer(
          ignoring: _showLeading,
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
    );
  }
}
