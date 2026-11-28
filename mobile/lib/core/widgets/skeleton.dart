import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';

/// Shared so every [SkeletonBox] pulses in step.
class _SkeletonShimmer extends InheritedWidget {
  const _SkeletonShimmer({required this.animation, required super.child});

  final Animation<double> animation;

  static Animation<double>? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_SkeletonShimmer>()?.animation;

  @override
  bool updateShouldNotify(_SkeletonShimmer oldWidget) =>
      oldWidget.animation != animation;
}

class SkeletonLoader extends StatefulWidget {
  const SkeletonLoader({super.key, required this.child});

  final Widget child;

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _SkeletonShimmer(animation: _controller, child: widget.child);
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 8,
    this.shape = BoxShape.rectangle,
  });

  const SkeletonBox.circle({super.key, required double size})
    : width = size,
      height = size,
      radius = 0,
      shape = BoxShape.circle;

  final double? width;
  final double height;
  final double radius;
  final BoxShape shape;

  static const Color _base = Color(0xFFDCEBD4);
  static const Color _highlight = Color(0xFFF2F8EE);

  @override
  Widget build(BuildContext context) {
    final animation = _SkeletonShimmer.maybeOf(context);
    final decoration = BoxDecoration(
      shape: shape,
      borderRadius: shape == BoxShape.circle
          ? null
          : BorderRadius.circular(radius),
    );

    if (animation == null) {
      return Container(
        width: width,
        height: height,
        decoration: decoration.copyWith(color: _base),
      );
    }

    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        final t = animation.value;
        return Container(
          width: width,
          height: height,
          decoration: decoration.copyWith(
            gradient: LinearGradient(
              begin: Alignment(-1 - 2 * (1 - t), 0),
              end: Alignment(1 - 2 * (1 - t) + 1, 0),
              colors: const [_base, _highlight, _base],
              stops: const [0.25, 0.5, 0.75],
            ),
          ),
        );
      },
    );
  }
}

class SkeletonCard extends StatelessWidget {
  const SkeletonCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: child,
    );
  }
}
