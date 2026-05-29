import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/info_board.dart';
import 'package:mobile/features/auth/presentation/widgets/mascot_hero.dart';

/// Welcome tour — full-height board, floating mascot alternates left/right per slide.
class WelcomeFilmScreen extends StatefulWidget {
  const WelcomeFilmScreen({super.key, required this.onComplete});

  final VoidCallback onComplete;

  @override
  State<WelcomeFilmScreen> createState() => _WelcomeFilmScreenState();
}

class _WelcomeFilmScreenState extends State<WelcomeFilmScreen>
    with TickerProviderStateMixin {
  static final _slideCount = AppCopy.filmSlides.length;

  late final AnimationController _introController;
  int _slideIndex = 0;
  bool _showIntro = true;

  bool get _isLastSlide => _slideIndex >= _slideCount - 1;
  bool get _canGoBack => _slideIndex > 0;
  // First half of slides on the left, second half on the right.
  bool get _mascotOnLeft => _slideIndex < (_slideCount / 2).ceil();

  @override
  void initState() {
    super.initState();
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..forward();
    _introController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        if (mounted) setState(() => _showIntro = false);
      }
    });
  }

  @override
  void dispose() {
    _introController.dispose();
    super.dispose();
  }

  void _goNext() {
    if (_isLastSlide) {
      widget.onComplete();
      return;
    }
    setState(() => _slideIndex++);
  }

  void _goBack() {
    if (!_canGoBack) return;
    setState(() => _slideIndex--);
  }

  @override
  Widget build(BuildContext context) {
    final slide = AppCopy.filmSlides[_slideIndex];
    final mascotW = MediaQuery.sizeOf(context).width * 0.34;
    final horizontalPad = 20.0;
    final mascotSize = mascotW.clamp(115.0, 155.0);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(horizontalPad, 8, 8, 0),
              child: Row(
                children: [
                  Image.asset(
                    AppAssets.logo,
                    width: 40,
                    height: 40,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppCopy.appName,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        Text(
                          AppCopy.filmMascotName,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.secondary.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: widget.onComplete,
                    style: TextButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: Text(
                      'Skip',
                      style: TextStyle(
                        color: AppColors.secondary.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: horizontalPad),
              child: Text(
                'Community Extension Services',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                  color: AppColors.secondary.withValues(alpha: 0.85),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: horizontalPad),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    if (_showIntro)
                      Positioned.fill(
                        child: Center(
                          child: AnimatedBuilder(
                            animation: _introController,
                            builder: (context, _) {
                              final t = _introController.value;
                              final letters = AppCopy.appName.split('');

                              final lettersIn = Curves.easeOutCubic.transform(
                                (t / 0.6).clamp(0.0, 1.0),
                              );
                              final lettersOut = Curves.easeInCubic.transform(
                                ((t - 0.62) / 0.18).clamp(0.0, 1.0),
                              );

                              final logoIn = Curves.easeOutBack.transform(
                                ((t - 0.72) / 0.28).clamp(0.0, 1.0),
                              );

                              return Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Opacity(
                                    opacity: (1 - lettersOut).clamp(0.0, 1.0),
                                    child: Transform.translate(
                                      offset: Offset(0, (1 - lettersIn) * 18),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: List.generate(letters.length, (i) {
                                          final start = i * 0.08;
                                          final inT = Curves.easeOutCubic.transform(
                                            ((t - start) / 0.22).clamp(0.0, 1.0),
                                          );
                                          return Opacity(
                                            opacity: inT,
                                            child: Transform.translate(
                                              offset: Offset(0, (1 - inT) * 10),
                                              child: Padding(
                                                padding: const EdgeInsets.symmetric(horizontal: 1),
                                                child: Text(
                                                  letters[i],
                                                  style: TextStyle(
                                                    fontSize: 44,
                                                    fontWeight: FontWeight.w900,
                                                    letterSpacing: -1.2,
                                                    color: AppColors.primaryDark,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          );
                                        }),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  Opacity(
                                    opacity: logoIn.clamp(0.0, 1.0),
                                    child: Transform.scale(
                                      scale: 0.72 + 0.28 * logoIn,
                                      child: Image.asset(
                                        AppAssets.logo,
                                        width: 96,
                                        height: 96,
                                        fit: BoxFit.contain,
                                        filterQuality: FilterQuality.high,
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      )
                    else ...[
                      Positioned.fill(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 400),
                          switchInCurve: Curves.easeOutCubic,
                          switchOutCurve: Curves.easeInCubic,
                          transitionBuilder: (child, animation) {
                            return FadeTransition(
                              opacity: animation,
                              child: child,
                            );
                          },
                          child: InfoBoard(
                            key: ValueKey(_slideIndex),
                            expand: true,
                            bottomInset: mascotSize * 0.55,
                            title: slide.boardTitle,
                            body: slide.boardBody,
                            slideIndex: _slideIndex,
                            slideCount: _slideCount,
                          ),
                        ),
                      ),
                      AnimatedAlign(
                        alignment: _mascotOnLeft
                            ? Alignment.bottomLeft
                            : Alignment.bottomRight,
                        duration: const Duration(milliseconds: 500),
                        curve: Curves.easeInOutCubic,
                        child: Padding(
                          padding:
                              const EdgeInsets.only(bottom: 8, left: 4, right: 4),
                          child: MascotHero(
                            poseAsset: slide.mascotAsset,
                            faceRight: !_mascotOnLeft,
                            width: mascotSize,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(horizontalPad, 12, horizontalPad, 8),
              child: _SlideProgressBar(
                slideIndex: _slideIndex,
                slideCount: _slideCount,
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(horizontalPad, 0, horizontalPad, 24),
              child: Column(
                children: [
                  Row(
                    children: [
                      SizedBox(
                        width: 88,
                        height: 48,
                        child: AnimatedOpacity(
                          opacity: _canGoBack ? 1 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: IgnorePointer(
                            ignoring: !_canGoBack,
                            child: OutlinedButton(
                              onPressed: _goBack,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                side: const BorderSide(color: AppColors.fieldBorder),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: const Text(
                                AppCopy.filmBackCta,
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 48,
                          child: FilledButton(
                            onPressed: _showIntro ? () => setState(() => _showIntro = false) : _goNext,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.accent,
                              foregroundColor: const Color(0xFF1B1B1B),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _showIntro
                                      ? 'Continue'
                                      : (_isLastSlide
                                          ? AppCopy.filmBeginCta
                                          : AppCopy.filmNextCta),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                if (!_showIntro && !_isLastSlide) ...[
                                  const SizedBox(width: 6),
                                  const Icon(Icons.arrow_forward_rounded, size: 20),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlideProgressBar extends StatelessWidget {
  const _SlideProgressBar({
    required this.slideIndex,
    required this.slideCount,
  });

  final int slideIndex;
  final int slideCount;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (slideIndex + 1) / slideCount,
            minHeight: 4,
            backgroundColor: AppColors.light.withValues(alpha: 0.4),
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(slideCount, (i) {
            final active = i == slideIndex;
            final visited = i < slideIndex;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 20 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: active
                    ? AppColors.primary
                    : visited
                        ? AppColors.secondary.withValues(alpha: 0.6)
                        : AppColors.light.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(4),
              ),
            );
          }),
        ),
      ],
    );
  }
}
