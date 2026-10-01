import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_caption.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_photo.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_progress.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_slides.dart';

/// The leading story between the splash and login: one full-bleed photo per
/// beat, dark green → black ground under the copy, and a single Continue.
///
/// Continue (or a swipe left) moves forward; Back (or a swipe right) moves
/// back. Continue on the last beat — or Skip — hands off via [onFinished];
/// the slide-away itself belongs to [AppFlow].
class LeadingStory extends StatefulWidget {
  const LeadingStory({
    super.key,
    required this.onFinished,
    this.initialIndex = 0,
  });

  final VoidCallback onFinished;

  /// Where the story opens. Pulled down again from login it opens on the last
  /// beat, so the person rolls back through it from the end.
  final int initialIndex;

  @override
  State<LeadingStory> createState() => LeadingStoryState();
}

class LeadingStoryState extends State<LeadingStory> {
  late int _index = widget.initialIndex.clamp(0, leadingSlides.length - 1);
  bool _forward = true;

  bool get _isLast => _index == leadingSlides.length - 1;

  void _next() {
    if (_isLast) {
      widget.onFinished();
      return;
    }
    HapticFeedback.selectionClick();
    setState(() {
      _forward = true;
      _index++;
    });
  }

  /// Steps one beat back. Returns false when already on the first beat, so a
  /// system back press can decide what else to do.
  bool goBack() {
    if (_index == 0) return false;
    HapticFeedback.selectionClick();
    setState(() {
      _forward = false;
      _index--;
    });
    return true;
  }

  void _onSwipe(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0;
    if (velocity < -320) _next();
    if (velocity > 320) goBack();
  }

  @override
  Widget build(BuildContext context) {
    final slide = leadingSlides[_index];

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onHorizontalDragEnd: _onSwipe,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const ColoredBox(color: AppColors.darkGreenBottom),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 850),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              layoutBuilder: (current, previous) => Stack(
                fit: StackFit.expand,
                children: [...previous, ?current],
              ),
              transitionBuilder: (child, animation) {
                final incoming = child.key == ValueKey(_index);
                if (!incoming) {
                  return FadeTransition(opacity: animation, child: child);
                }
                // The new photo settles in from slightly closer — a soft
                // camera move rather than a hard cut.
                return FadeTransition(
                  opacity: animation,
                  child: ScaleTransition(
                    scale: Tween(begin: 1.12, end: 1.0).animate(animation),
                    child: child,
                  ),
                );
              },
              child: LeadingPhoto(key: ValueKey(_index), slide: slide),
            ),
            const _Scrim(),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LeadingProgress(
                      count: leadingSlides.length,
                      index: _index,
                    ),
                    const SizedBox(height: 6),
                    _TopBar(
                      showBack: _index > 0,
                      onBack: goBack,
                      onSkip: widget.onFinished,
                    ),
                    const Spacer(),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 420),
                      reverseDuration: const Duration(milliseconds: 220),
                      layoutBuilder: (current, previous) => Stack(
                        alignment: Alignment.bottomLeft,
                        children: [...previous, ?current],
                      ),
                      // The caption staggers its own entrance; the switcher
                      // only fades the outgoing one away.
                      transitionBuilder: (child, animation) =>
                          child.key == ValueKey(_index)
                          ? child
                          : FadeTransition(opacity: animation, child: child),
                      child: LeadingCaption(
                        key: ValueKey(_index),
                        copy: slide.copy,
                        forward: _forward,
                      ),
                    ),
                    const SizedBox(height: 28),
                    _ContinueButton(onPressed: _next),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Darkens the top for the status bar and progress, leaves the middle of the
/// photo clear, then falls into the dark green → black ground under the copy.
class _Scrim extends StatelessWidget {
  const _Scrim();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.55),
            Colors.black.withValues(alpha: 0.0),
            AppColors.darkGreenTop.withValues(alpha: 0.0),
            AppColors.darkGreenMid.withValues(alpha: 0.88),
            AppColors.darkGreenBottom,
          ],
          stops: const [0.0, 0.2, 0.38, 0.62, 1.0],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.showBack,
    required this.onBack,
    required this.onSkip,
  });

  final bool showBack;
  final VoidCallback onBack;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AnimatedOpacity(
          opacity: showBack ? 1 : 0,
          duration: const Duration(milliseconds: 250),
          child: IgnorePointer(
            ignoring: !showBack,
            child: _BackControl(onTap: onBack),
          ),
        ),
        const Spacer(),
        TextButton(
          onPressed: onSkip,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.onDarkGreen,
            padding: const EdgeInsets.fromLTRB(12, 8, 0, 8),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text(
            AppCopy.leadingSkipCta,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

/// Same shape as the approved header back control: chevron + "Back", flush on
/// the 20pt content margin.
class _BackControl extends StatelessWidget {
  const _BackControl({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: AppCopy.leadingBackCta,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: const Padding(
          padding: EdgeInsets.fromLTRB(0, 8, 12, 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 17,
                color: AppColors.onDarkGreen,
              ),
              SizedBox(width: 5),
              Text(
                AppCopy.leadingBackCta,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.onDarkGreen,
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContinueButton extends StatelessWidget {
  const _ContinueButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: const StadiumBorder(),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              AppCopy.leadingContinueCta,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            SizedBox(width: 8),
            Icon(Icons.arrow_forward_rounded, size: 20),
          ],
        ),
      ),
    );
  }
}
