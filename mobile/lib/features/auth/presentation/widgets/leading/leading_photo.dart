import 'package:flutter/material.dart';
import 'package:mobile/features/auth/presentation/widgets/leading/leading_slides.dart';

/// Full-bleed story photo with a slow Ken Burns push-in, so a still frame
/// still feels alive while the person reads.
class LeadingPhoto extends StatefulWidget {
  const LeadingPhoto({super.key, required this.slide});

  final LeadingSlide slide;

  @override
  State<LeadingPhoto> createState() => _LeadingPhotoState();
}

class _LeadingPhotoState extends State<LeadingPhoto>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drift = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 12),
  )..repeat(reverse: true);

  late final Animation<double> _scale = Tween<double>(begin: 1.0, end: 1.08)
      .animate(CurvedAnimation(parent: _drift, curve: Curves.easeInOutSine));

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      alignment: widget.slide.focal,
      child: Image(
        image: leadingImage(context, widget.slide.asset),
        fit: BoxFit.cover,
        alignment: widget.slide.focal,
        width: double.infinity,
        height: double.infinity,
        gaplessPlayback: true,
        filterQuality: FilterQuality.medium,
      ),
    );
  }
}
