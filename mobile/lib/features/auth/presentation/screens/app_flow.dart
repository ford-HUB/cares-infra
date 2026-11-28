import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/leading_story_storage.dart';
import 'package:mobile/features/auth/data/session_restore_service.dart';
import 'package:mobile/features/auth/presentation/providers/app_update_provider.dart';
import 'package:mobile/features/auth/presentation/providers/session_restore_provider.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/app_entry_intro.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_slides.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_story.dart';
import 'package:mobile/features/auth/presentation/widgets/splash_update_panel.dart';

/// Entry splash → leading story → login, as three stacked opaque layers; each
/// hand-off slides one layer away (smoother than a height-morph).
///
/// Pulling login's header down brings the story back, opened on its last beat.
/// The splash also offers updates ([SplashUpdatePanel]) and restores the
/// session: live → dashboard, expired → login with the reason, none → story
/// (first install only, see [LeadingStoryStorage]).
class AppFlow extends ConsumerStatefulWidget {
  const AppFlow({super.key});

  @override
  ConsumerState<AppFlow> createState() => _AppFlowState();
}

class _AppFlowState extends ConsumerState<AppFlow>
    with TickerProviderStateMixin {
  late final AnimationController _introController;

  late final AnimationController _handoffController;

  late final Animation<double> _curtainSlide;

  /// 0 covers the screen, 1 is fully off the top; finger-driven when pulled
  /// from login.
  late final AnimationController _leadingController;

  GlobalKey<LeadingStoryState> _leadingKey = GlobalKey<LeadingStoryState>();
  int _leadingStartIndex = 0;

  bool _showLeading = false;
  bool _showLogin = false;
  bool _introDone = false;
  bool _assetsWarmed = false;

  /// The curtain may leave once the update check allows.
  bool _introFinished = false;
  bool _handoffStarted = false;

  /// Null until preferences are read (well within the intro).
  bool? _leadingSeen;

  static const Duration _slideDuration = Duration(milliseconds: 850);

  @override
  void initState() {
    super.initState();
    // Both exist before ticking: the intro's completion listener uses the
    // handoff one.
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
      curve: Curves.easeInOutCubic,
    );

    _introController.addStatusListener((status) {
      if (status != AnimationStatus.completed || !mounted) return;
      _introFinished = true;
      _maybeHandOff();
    });

    _handoffController.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        // Curtain is off-screen — drop it so its painters stop ticking.
        setState(() => _introDone = true);
      }
    });

    _introController.forward();
    LeadingStoryStorage.instance.hasSeen().then((seen) {
      _leadingSeen = seen;
      _maybeHandOff();
    });
    // Deferred: a provider may not change state during build.
    Future.microtask(() {
      if (!mounted) return;
      ref.read(appUpdateProvider.notifier).check();
      // Overlaps the intro so a returning person rarely waits.
      ref.read(sessionRestoreProvider);
    });
  }

  /// Waits for the intro, any update offer (the check times out in seconds) and
  /// the session restore.
  void _maybeHandOff() {
    if (!mounted || !_introFinished || _handoffStarted) return;
    if (_leadingSeen == null) return;
    if (ref.read(appUpdateProvider).holdsSplash) return;

    final restore = ref.read(sessionRestoreProvider);
    if (restore.isLoading) return;
    _handoffStarted = true;

    // A failed restore is treated as nothing saved: the person signs in.
    final result = restore.valueOrNull;
    switch (result?.status) {
      case SessionRestoreStatus.restored:
        final session = result!.session!;
        DashboardRouter.navigateToRoleDashboard(
          context,
          roleType: session.roleType,
          email: session.email,
          firstName: session.firstName,
          lastName: session.lastName,
          profileComplete: session.hasInterests,
          hasInterests: session.hasInterests,
          unlockedRoles: session.unlockedRoles,
        );
        return;

      case SessionRestoreStatus.expired:
        // Straight to login — this person has seen the story before.
        _handOffToLogin(
          message: result!.message ?? SessionRestoreService.expiredMessage,
        );
        return;

      case SessionRestoreStatus.none:
      case null:
        if (_leadingSeen!) {
          _handOffToLogin();
          return;
        }
        // Lay the story out a frame early so its first paint lands before the
        // curtain moves.
        setState(() => _showLeading = true);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _handoffController.forward();
        });
    }
  }

  void _handOffToLogin({String? message}) {
    setState(() => _showLogin = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _handoffController.forward();
      if (message == null) return;
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          SnackBar(
            content: Text(message),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
          ),
        );
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_assetsWarmed) return;
    _assetsWarmed = true;
    // Decode photos during the splash, not on the first reveal frame.
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

  void _dismissLeading() {
    if (_leadingSeen != true) {
      _leadingSeen = true;
      LeadingStoryStorage.instance.markSeen();
    }
    if (!_showLogin) {
      // Give login a frame to lay out first, as the splash does for the story.
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

  /// Steps back a beat; on the first beat returns to login, or leaves the app.
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
    ref.listen(appUpdateProvider, (_, next) {
      if (!next.holdsSplash) _maybeHandOff();
    });
    ref.listen(sessionRestoreProvider, (_, next) {
      if (!next.isLoading) _maybeHandOff();
    });

    return PopScope(
      canPop: !_showLeading,
      onPopInvokedWithResult: _onSystemBack,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // No fade or transform, so login's own header animation plays as
            // designed.
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
        // Rounded corners read as a sheet moving over login, not a hard seam.
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

  Widget _buildIntro() {
    final shows = ref.watch(appUpdateProvider.select((s) => s.showsPanel));
    final lift = shows ? MediaQuery.sizeOf(context).height * 0.45 : 0.0;
    return TweenAnimationBuilder<double>(
      tween: Tween(end: lift),
      duration: const Duration(milliseconds: 520),
      curve: Curves.easeOutCubic,
      builder: (context, inset, _) => AnimatedBuilder(
        animation: _introController,
        builder: (context, _) => AppEntryIntro(
          progress: _introController.value,
          contentBottomInset: inset,
        ),
      ),
    );
  }

  Widget _buildUpdatePanel() {
    final shows = ref.watch(appUpdateProvider.select((s) => s.showsPanel));
    return SafeArea(
      child: Align(
        alignment: Alignment.bottomCenter,
        child: AnimatedSlide(
          offset: shows ? Offset.zero : const Offset(0, 1.2),
          duration: const Duration(milliseconds: 520),
          curve: Curves.easeOutCubic,
          child: AnimatedOpacity(
            opacity: shows ? 1 : 0,
            duration: const Duration(milliseconds: 320),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: shows
                  ? const SplashUpdatePanel()
                  : const SizedBox.shrink(),
            ),
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
            child: Stack(
              fit: StackFit.expand,
              children: [_buildIntro(), _buildUpdatePanel()],
            ),
          ),
        ),
      ),
    );
  }
}
