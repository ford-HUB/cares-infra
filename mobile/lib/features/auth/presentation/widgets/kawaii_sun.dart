import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:mobile/core/models/sun_weather_mood.dart';

/// Kawaii cartoon sun — closes eyes and puts on sunglasses when [passwordVisible].
class KawaiiSun extends StatefulWidget {
  const KawaiiSun({
    super.key,
    required this.size,
    required this.passwordVisible,
    this.progress = 1.0,
    this.ambient = 0.0,
    this.weatherMood = SunWeatherMood.clear,
  });

  final double size;
  final bool passwordVisible;
  final double progress;
  final double ambient;
  final SunWeatherMood weatherMood;

  @override
  State<KawaiiSun> createState() => _KawaiiSunState();
}

class _KawaiiSunState extends State<KawaiiSun> with TickerProviderStateMixin {
  late final AnimationController _revealController;
  late final AnimationController _blinkController;

  @override
  void initState() {
    super.initState();
    _revealController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
      value: widget.passwordVisible ? 1.0 : 0.0,
    );
    _blinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _schedulePeriodicBlink();
  }

  void _schedulePeriodicBlink() {
    Future<void>.delayed(const Duration(seconds: 10), _triggerBlink);
  }

  Future<void> _triggerBlink() async {
    if (!mounted) return;
    if (!widget.passwordVisible && _revealController.value < 0.01) {
      await _blinkController.forward();
      if (mounted) await _blinkController.reverse();
    }
    if (mounted) _schedulePeriodicBlink();
  }

  @override
  void didUpdateWidget(KawaiiSun oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.passwordVisible != widget.passwordVisible) {
      if (widget.passwordVisible) {
        _blinkController.value = 0;
        _revealController.forward();
      } else {
        _revealController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _revealController.dispose();
    _blinkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fadeIn = Curves.easeOut.transform(widget.progress.clamp(0.0, 1.0));
    final scale = 0.85 + 0.15 * fadeIn;
    final canvasSize = _canvasSize(widget.weatherMood, widget.size);

    return AnimatedBuilder(
      animation: Listenable.merge([_revealController, _blinkController]),
      builder: (context, _) {
        return Opacity(
          opacity: fadeIn,
          child: Transform.scale(
            scale: scale,
            alignment: Alignment.centerRight,
            child: SizedBox(
              width: canvasSize.width,
              height: canvasSize.height,
              child: CustomPaint(
                painter: _KawaiiSunPainter(
                  sunSize: widget.size,
                  revealProgress: Curves.easeInOut.transform(_revealController.value),
                  blinkClosedAmount: Curves.easeInOut.transform(_blinkController.value),
                  ambient: widget.ambient,
                  weatherMood: widget.weatherMood,
                  rainPhase: widget.ambient,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

Size kawaiiSunCanvasSize(SunWeatherMood mood, double sunSize) {
  return switch (mood) {
    SunWeatherMood.clear => Size(sunSize, sunSize),
    SunWeatherMood.cloudy => Size(sunSize * 2.25, sunSize * 1.08),
    SunWeatherMood.rainy => Size(sunSize * 2.25, sunSize * 1.22),
  };
}

/// Horizontal center of the sun disc within the weather canvas.
double kawaiiSunDiscCenterX(SunWeatherMood mood, double sunSize) {
  final canvas = kawaiiSunCanvasSize(mood, sunSize);
  if (mood == SunWeatherMood.clear) return canvas.width / 2;
  return canvas.width * 0.72;
}

Size _canvasSize(SunWeatherMood mood, double sunSize) =>
    kawaiiSunCanvasSize(mood, sunSize);

class _SunFaceLayout {
  _SunFaceLayout({required this.center, required this.bodyRadius});

  final Offset center;
  final double bodyRadius;

  double get faceCenterY => center.dy + bodyRadius * 0.14;
  double get eyeSpacing => bodyRadius * 0.44;
  double get eyeY => faceCenterY - bodyRadius * 0.1;
  double get eyeRadius => bodyRadius * 0.09;

  Offset get leftEye => Offset(center.dx - eyeSpacing / 2, eyeY);
  Offset get rightEye => Offset(center.dx + eyeSpacing / 2, eyeY);
  Offset get shadesCenter => Offset(center.dx, eyeY);
}

class _KawaiiSunPainter extends CustomPainter {
  _KawaiiSunPainter({
    required this.sunSize,
    required this.revealProgress,
    required this.blinkClosedAmount,
    required this.ambient,
    required this.weatherMood,
    required this.rainPhase,
  });

  final double sunSize;
  final double revealProgress;
  final double blinkClosedAmount;
  final double ambient;
  final SunWeatherMood weatherMood;
  final double rainPhase;

  static const _bodyLight = Color(0xFFFFF176);
  static const _bodyMid = Color(0xFFFFEB3B);
  static const _bodyDark = Color(0xFFFFC107);
  static const _rayTip = Color(0xFFFFCA28);
  static const _rayBase = Color(0xFFFFFDE7);
  static const _blush = Color(0xFFF48FB1);
  static const _mouthColor = Color(0xFF6D4C41);
  static const _eyeColor = Color(0xFF3E2723);
  static const _armColor = Color(0xFFFFB74D);
  static const _handColor = Color(0xFFFFCC80);
  static const _shadesLens = Color(0xFF263238);
  static const _cloudLight = Color(0xFFECEFF1);
  static const _cloudDark = Color(0xFF90A4AE);
  static const _cloudShadow = Color(0xFF78909C);
  static const _rainColor = Color(0xFF64B5F6);
  static const _shadesFrame = Color(0xFF37474F);

  static double _glowDimmer(SunWeatherMood mood) {
    return switch (mood) {
      SunWeatherMood.clear => 1.0,
      SunWeatherMood.cloudy => 0.7,
      SunWeatherMood.rainy => 0.75,
    };
  }

  static double _segment(double t, double start, double end) {
    if (t <= start) return 0;
    if (t >= end) return 1;
    return Curves.easeInOut.transform((t - start) / (end - start));
  }

  static double _eyeOpenAmount(double t) {
    if (t >= 0.25) return 0;
    return 1 - _segment(t, 0, 0.25);
  }

  static double _combinedEyeOpen(double revealT, double blinkClosed) {
    return _eyeOpenAmount(revealT) * (1 - blinkClosed);
  }

  static double _mouthSeriousAmount(double t) {
    if (t <= 0.1) return 0;
    if (t >= 0.25) return 1;
    return _segment(t, 0.1, 0.25);
  }

  static bool _armVisible(double t) => t > 0.25 && t < 1.0;

  static double _armAmount(double t) {
    if (t <= 0.25 || t >= 1.0) return 0;
    final retract = _segment(t, 0.85, 1.0);
    return 1 - retract;
  }

  /// 0 = shades off-screen in hand, 1 = shades locked on face.
  static double _shadesOnFaceAmount(double t) {
    if (t < 0.55) return 0;
    if (t >= 0.85) return 1;
    return _segment(t, 0.55, 0.85);
  }

  static Offset _handPosition(Offset center, double bodyRadius, double t) {
    final fetch = _segment(t, 0.25, 0.55);
    final place = _segment(t, 0.55, 0.85);
    final retract = _segment(t, 0.85, 1.0);

    final offScreen = Offset(center.dx + bodyRadius * 1.55, center.dy + bodyRadius * 0.05);
    final atFace = Offset(center.dx + bodyRadius * 0.72, center.dy - bodyRadius * 0.02);
    final hidden = Offset(center.dx + bodyRadius * 1.35, center.dy + bodyRadius * 0.12);

    if (t < 0.55) {
      return Offset.lerp(hidden, offScreen, fetch)!;
    }
    if (t < 0.85) {
      return Offset.lerp(offScreen, atFace, place)!;
    }
    return Offset.lerp(atFace, hidden, retract)!;
  }

  static Offset _shadesPosition(_SunFaceLayout face, double bodyRadius, double t) {
    final onFace = _shadesOnFaceAmount(t);
    final hand = _handPosition(face.center, bodyRadius, t);
    return Offset.lerp(hand, face.shadesCenter, onFace)!;
  }

  static double _shadesOpacity(double t) {
    if (t < 0.4) return 0;
    if (t < 0.55) return _segment(t, 0.4, 0.55);
    return 1;
  }

  Offset _sunCenter(Size canvasSize) {
    if (weatherMood == SunWeatherMood.clear) {
      return Offset(canvasSize.width / 2, canvasSize.height / 2);
    }
    return Offset(canvasSize.width * 0.72, canvasSize.height * 0.44);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final center = _sunCenter(size);
    final bodyRadius = sunSize * 0.28;
    final heatPulse = 0.85 + 0.15 * math.sin(ambient * math.pi * 2);
    final pulse = 1 + 0.018 * math.sin(ambient * math.pi * 2);
    final scaledBodyRadius = bodyRadius * pulse;
    final face = _SunFaceLayout(center: center, bodyRadius: scaledBodyRadius);
    final t = revealProgress;
    final glowScale = _glowDimmer(weatherMood);

    _drawHeatBloom(canvas, center, scaledBodyRadius, heatPulse * glowScale);
    _drawGlareStreaks(canvas, size, center, scaledBodyRadius, heatPulse * glowScale);
    _drawRays(canvas, center, scaledBodyRadius, pulse);
    _drawBody(canvas, center, scaledBodyRadius);

    if (weatherMood != SunWeatherMood.clear) {
      _drawClouds(canvas, center, scaledBodyRadius, onTopOfFace: false);
    }

    _drawFace(
      canvas,
      face,
      _combinedEyeOpen(t, blinkClosedAmount),
      _mouthSeriousAmount(t),
    );

    final shadesOpacity = _shadesOpacity(t);
    final shadesOnFace = _shadesOnFaceAmount(t);
    final armVisible = _armVisible(t);
    final hand = armVisible ? _handPosition(center, scaledBodyRadius, t) : null;
    final armAmount = armVisible ? _armAmount(t) : 0.0;
    final shadesPos = shadesOpacity > 0
        ? (shadesOnFace >= 1
            ? face.shadesCenter
            : _shadesPosition(face, scaledBodyRadius, t))
        : null;

    if (shadesOpacity > 0 && shadesOnFace >= 1) {
      _drawSunglasses(
        canvas,
        face,
        face.shadesCenter,
        opacity: shadesOpacity,
        scale: 1,
      );
    }

    if (armVisible) {
      if (shadesOpacity > 0 && shadesOnFace < 1) {
        _drawSunglasses(
          canvas,
          face,
          _shadesPosition(face, scaledBodyRadius, t),
          opacity: shadesOpacity,
          scale: 0.92 + 0.08 * (1 - shadesOnFace),
        );
      }
      _drawArm(canvas, center, scaledBodyRadius, hand!, armAmount);
    }

    if (weatherMood != SunWeatherMood.clear) {
      _drawClouds(
        canvas,
        center,
        scaledBodyRadius,
        onTopOfFace: true,
        hand: hand,
        armAmount: armAmount,
        shadesPos: shadesPos,
        shadesOpacity: shadesOpacity,
      );
    }

    if (weatherMood == SunWeatherMood.rainy) {
      _drawRain(canvas, center, scaledBodyRadius, rainPhase);
    }
  }

  bool _cloudNearPoint(Offset anchor, double cloudScale, Offset point) {
    return (anchor - point).distance < cloudScale * 0.62;
  }

  bool _cloudShouldOccludeForeground(
    Offset sunCenter,
    double bodyRadius,
    Offset anchor,
    double cloudScale, {
    Offset? hand,
    double armAmount = 0,
    Offset? shadesPos,
    double shadesOpacity = 0,
  }) {
    if (_cloudOverlapsSun(sunCenter, bodyRadius, anchor, cloudScale)) {
      return true;
    }

    if (shadesOpacity > 0 && shadesPos != null &&
        _cloudNearPoint(anchor, cloudScale, shadesPos)) {
      return true;
    }

    if (armAmount > 0 && hand != null) {
      if (_cloudNearPoint(anchor, cloudScale, hand)) return true;

      final shoulder = Offset(
        sunCenter.dx + bodyRadius * 0.55,
        sunCenter.dy + bodyRadius * 0.18,
      );
      final elbow = Offset(
        shoulder.dx + (hand.dx - shoulder.dx) * 0.45,
        shoulder.dy + (hand.dy - shoulder.dy) * 0.35 - bodyRadius * 0.08,
      );
      if (_cloudNearPoint(anchor, cloudScale, shoulder) ||
          _cloudNearPoint(anchor, cloudScale, elbow)) {
        return true;
      }
    }

    return false;
  }

  bool _cloudOverlapsSun(
    Offset sunCenter,
    double bodyRadius,
    Offset anchor,
    double cloudScale,
  ) {
    final reach = cloudScale * 0.58;
    return (anchor - sunCenter).distance < bodyRadius * 0.92 + reach;
  }

  List<({Offset anchor, double scale})> _cloudSpecs(Offset center, double bodyRadius) {
    final specs = <({Offset anchor, double scale})>[
      // Left flank
      (anchor: center + Offset(-bodyRadius * 1.55, -bodyRadius * 0.18), scale: 0.78),
      (anchor: center + Offset(-bodyRadius * 1.18, -bodyRadius * 0.05), scale: 0.88),
      (anchor: center + Offset(-bodyRadius * 0.82, bodyRadius * 0.12), scale: 0.82),
      (anchor: center + Offset(-bodyRadius * 1.38, bodyRadius * 0.2), scale: 0.72),
      // Right flank
      (anchor: center + Offset(bodyRadius * 0.62, bodyRadius * 0.18), scale: 0.76),
      (anchor: center + Offset(bodyRadius * 0.88, -bodyRadius * 0.08), scale: 0.7),
      (anchor: center + Offset(bodyRadius * 1.08, bodyRadius * 0.28), scale: 0.65),
      // Below sun
      (anchor: center + Offset(-bodyRadius * 0.52, bodyRadius * 0.58), scale: 0.84),
      (anchor: center + Offset(bodyRadius * 0.18, bodyRadius * 0.66), scale: 0.76),
      (anchor: center + Offset(-bodyRadius * 0.08, bodyRadius * 0.72), scale: 0.68),
    ];

    if (weatherMood == SunWeatherMood.rainy) {
      specs.addAll([
        (anchor: center + Offset(-bodyRadius * 0.08, -bodyRadius * 0.12), scale: 1.08),
        (anchor: center + Offset(bodyRadius * 0.24, -bodyRadius * 0.02), scale: 0.95),
        (anchor: center + Offset(bodyRadius * 0.02, bodyRadius * 0.06), scale: 0.88),
      ]);
    }

    return specs;
  }

  void _drawClouds(
    Canvas canvas,
    Offset center,
    double bodyRadius, {
    required bool onTopOfFace,
    Offset? hand,
    double armAmount = 0,
    Offset? shadesPos,
    double shadesOpacity = 0,
  }) {
    final isRainy = weatherMood == SunWeatherMood.rainy;
    final primary = isRainy ? _cloudLight : _cloudDark;
    final secondary = isRainy ? const Color(0xFFCFD8DC) : _cloudShadow;

    for (final cloud in _cloudSpecs(center, bodyRadius)) {
      final cloudScale = bodyRadius * cloud.scale;
      final occludes = _cloudShouldOccludeForeground(
        center,
        bodyRadius,
        cloud.anchor,
        cloudScale,
        hand: hand,
        armAmount: armAmount,
        shadesPos: shadesPos,
        shadesOpacity: shadesOpacity,
      );
      if (occludes != onTopOfFace) continue;

      _drawCloudPuff(
        canvas,
        cloud.anchor,
        cloudScale,
        primary,
        secondary,
      );
    }
  }

  void _drawCloudPuff(
    Canvas canvas,
    Offset anchor,
    double scale,
    Color fill,
    Color shadow,
  ) {
    final puffs = [
      (Offset(-scale * 0.45, 0.0), scale * 0.42),
      (Offset(0.0, -scale * 0.12), scale * 0.52),
      (Offset(scale * 0.42, 0.02), scale * 0.38),
      (Offset(scale * 0.12, scale * 0.08), scale * 0.34),
    ];

    for (final (offset, radius) in puffs) {
      canvas.drawCircle(
        anchor + offset,
        radius,
        Paint()..color = shadow.withValues(alpha: 0.35),
      );
    }

    for (final (offset, radius) in puffs) {
      canvas.drawCircle(
        anchor + offset,
        radius * 0.92,
        Paint()..color = fill,
      );
    }
  }

  void _drawRain(Canvas canvas, Offset center, double bodyRadius, double phase) {
    const dropCount = 14;
    final rainPaint = Paint()
      ..color = _rainColor.withValues(alpha: 0.75)
      ..strokeWidth = bodyRadius * 0.025
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < dropCount; i++) {
      final x = center.dx - bodyRadius * 1.1 + (i * bodyRadius * 0.16);
      final cycle = (phase + i * 0.08) % 1.0;
      final yStart = center.dy + bodyRadius * 0.42 + cycle * bodyRadius * 0.62;
      final yEnd = yStart + bodyRadius * 0.16;
      canvas.drawLine(Offset(x, yStart), Offset(x - bodyRadius * 0.03, yEnd), rainPaint);
    }
  }

  void _drawHeatBloom(Canvas canvas, Offset center, double bodyRadius, double heatPulse) {
    final layers = [
      (scale: 3.2, inner: Colors.white, mid: _bodyLight, outer: _bodyMid, alpha: 0.12),
      (scale: 2.6, inner: _bodyLight, mid: _bodyMid, outer: _bodyDark, alpha: 0.2),
      (scale: 2.1, inner: _bodyMid, mid: _bodyDark, outer: const Color(0xFFFF9800), alpha: 0.28),
      (scale: 1.7, inner: _bodyLight, mid: _bodyMid, outer: Colors.transparent, alpha: 0.38),
      (scale: 1.35, inner: Colors.white, mid: _bodyLight, outer: Colors.transparent, alpha: 0.5),
    ];

    for (final layer in layers) {
      final glowRadius = bodyRadius * layer.scale * heatPulse;
      canvas.drawCircle(
        center,
        glowRadius,
        Paint()
          ..shader = ui.Gradient.radial(
            center,
            glowRadius,
            [
              layer.inner.withValues(alpha: layer.alpha * heatPulse),
              layer.mid.withValues(alpha: layer.alpha * 0.55 * heatPulse),
              layer.outer.withValues(alpha: layer.alpha * 0.08 * heatPulse),
              Colors.transparent,
            ],
            [0.0, 0.35, 0.7, 1.0],
          ),
      );
    }
  }

  void _drawGlareStreaks(
    Canvas canvas,
    Size size,
    Offset center,
    double bodyRadius,
    double heatPulse,
  ) {
    for (var i = 0; i < 4; i++) {
      final drift = math.sin(ambient * math.pi * 2 + i * 1.4) * bodyRadius * 0.08;
      final y = center.dy + bodyRadius * (0.35 + i * 0.22) + drift;
      final width = bodyRadius * (2.8 + i * 0.4);
      final rect = Rect.fromCenter(
        center: Offset(center.dx + bodyRadius * 0.15, y),
        width: width,
        height: bodyRadius * 0.07,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(bodyRadius * 0.035)),
        Paint()
          ..shader = ui.Gradient.linear(
            Offset(rect.left, y),
            Offset(rect.right, y),
            [
              Colors.transparent,
              Colors.white.withValues(alpha: 0.18 * heatPulse),
              _bodyLight.withValues(alpha: 0.12 * heatPulse),
              Colors.transparent,
            ],
            [0.0, 0.35, 0.65, 1.0],
          ),
      );
    }
  }

  void _drawRays(Canvas canvas, Offset center, double bodyRadius, double pulse) {
    const rayCount = 12;
    final inner = bodyRadius * 1.05;
    final outer = bodyRadius * 1.55 * pulse;
    final halfWidth = bodyRadius * 0.14;

    for (var i = 0; i < rayCount; i++) {
      final angle = (i / rayCount) * math.pi * 2 - math.pi / 2;
      final dir = Offset(math.cos(angle), math.sin(angle));
      final perp = Offset(-dir.dy, dir.dx);

      final tip = center + dir * outer;
      final baseCenter = center + dir * inner;
      final baseL = baseCenter + perp * halfWidth;
      final baseR = baseCenter - perp * halfWidth;

      final ray = Path()
        ..moveTo(baseL.dx, baseL.dy)
        ..lineTo(tip.dx, tip.dy)
        ..lineTo(baseR.dx, baseR.dy)
        ..close();

      canvas.drawPath(
        ray,
        Paint()
          ..shader = ui.Gradient.linear(
            baseCenter,
            tip,
            [_rayBase, _bodyMid, _rayTip],
            [0.0, 0.45, 1.0],
          ),
      );
    }
  }

  void _drawBody(Canvas canvas, Offset center, double bodyRadius) {
    canvas.drawCircle(
      center,
      bodyRadius,
      Paint()
        ..shader = ui.Gradient.radial(
          center - Offset(bodyRadius * 0.14, bodyRadius * 0.14),
          bodyRadius * 1.15,
          [
            Colors.white,
            _bodyLight,
            _bodyMid,
            _bodyDark,
            const Color(0xFFFF9800).withValues(alpha: 0.35),
          ],
          [0.0, 0.2, 0.55, 0.85, 1.0],
        ),
    );
  }

  void _drawFace(
    Canvas canvas,
    _SunFaceLayout face,
    double eyeOpen,
    double mouthSerious,
  ) {
    _drawBlush(
      canvas,
      Offset(face.leftEye.dx - face.bodyRadius * 0.02, face.eyeY + face.bodyRadius * 0.12),
      face.bodyRadius,
    );
    _drawBlush(
      canvas,
      Offset(face.rightEye.dx + face.bodyRadius * 0.02, face.eyeY + face.bodyRadius * 0.12),
      face.bodyRadius,
    );
    _drawEyes(canvas, face.leftEye, face.rightEye, face.eyeRadius, eyeOpen);
    _drawMouth(canvas, face.center, face.faceCenterY, face.bodyRadius, mouthSerious);
  }

  void _drawBlush(Canvas canvas, Offset pos, double bodyRadius) {
    canvas.drawOval(
      Rect.fromCenter(
        center: pos,
        width: bodyRadius * 0.22,
        height: bodyRadius * 0.1,
      ),
      Paint()..color = _blush.withValues(alpha: 0.6),
    );
  }

  void _drawEyes(
    Canvas canvas,
    Offset left,
    Offset right,
    double eyeRadius,
    double open,
  ) {
    final eyeOpen = open.clamp(0.0, 1.0);

    if (eyeOpen > 0.01) {
      final scaledRadius = eyeRadius * eyeOpen;
      final eyePaint = Paint()
        ..color = _eyeColor.withValues(alpha: eyeOpen)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(left, scaledRadius, eyePaint);
      canvas.drawCircle(right, scaledRadius, eyePaint);
    }

    if (eyeOpen < 0.99) {
      final closedStrength = 1 - eyeOpen;
      final lidPaint = Paint()
        ..color = _eyeColor.withValues(alpha: closedStrength * 0.85)
        ..style = PaintingStyle.stroke
        ..strokeWidth = eyeRadius * 0.22
        ..strokeCap = StrokeCap.round;

      final arcWidth = eyeRadius * 1.6;
      final arcHeight = eyeRadius * 0.9 * closedStrength;

      for (final eye in [left, right]) {
        final lid = Path()
          ..moveTo(eye.dx - arcWidth / 2, eye.dy)
          ..quadraticBezierTo(
            eye.dx,
            eye.dy + arcHeight,
            eye.dx + arcWidth / 2,
            eye.dy,
          );
        canvas.drawPath(lid, lidPaint);
      }
    }
  }

  void _drawMouth(
    Canvas canvas,
    Offset center,
    double faceCenterY,
    double bodyRadius,
    double seriousAmount,
  ) {
    final mouthY = faceCenterY + bodyRadius * 0.24;
    final mouthWidth = bodyRadius * 0.38;
    final strokeWidth = bodyRadius * 0.055;
    final serious = seriousAmount.clamp(0.0, 1.0);

    final smilePaint = Paint()
      ..color = _mouthColor.withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Default: simple upward smile curve (no tongue, no filled mouth).
    final smile = Path()
      ..moveTo(center.dx - mouthWidth / 2, mouthY)
      ..quadraticBezierTo(
        center.dx,
        mouthY + bodyRadius * 0.14 * (1 - serious),
        center.dx + mouthWidth / 2,
        mouthY,
      );

    // Password visible: straight serious line "-".
    final seriousLine = Path()
      ..moveTo(center.dx - mouthWidth / 2, mouthY)
      ..lineTo(center.dx + mouthWidth / 2, mouthY);

    if (serious < 0.01) {
      canvas.drawPath(smile, smilePaint);
      return;
    }

    if (serious > 0.99) {
      canvas.drawPath(seriousLine, smilePaint..strokeWidth = strokeWidth * 1.05);
      return;
    }

    canvas.drawPath(smile, smilePaint..color = _mouthColor.withValues(alpha: 0.85 * (1 - serious)));
    canvas.drawPath(
      seriousLine,
      smilePaint
        ..color = _mouthColor.withValues(alpha: 0.85 * serious)
        ..strokeWidth = strokeWidth * (1 + serious * 0.05),
    );
  }

  void _drawSunglasses(
    Canvas canvas,
    _SunFaceLayout face,
    Offset position, {
    required double opacity,
    required double scale,
  }) {
    if (opacity <= 0) return;

    final lensW = face.eyeRadius * 1.55 * scale;
    final lensH = face.eyeRadius * 1.35 * scale;
    final bridgeW = face.bodyRadius * 0.08;
    final leftLensCenter = Offset(position.dx - face.eyeSpacing / 2, position.dy);
    final rightLensCenter = Offset(position.dx + face.eyeSpacing / 2, position.dy);

    final framePaint = Paint()
      ..color = _shadesFrame.withValues(alpha: opacity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = face.bodyRadius * 0.035;

    final lensPaint = Paint()..color = _shadesLens.withValues(alpha: 0.92 * opacity);

    for (final lensCenter in [leftLensCenter, rightLensCenter]) {
      final rect = Rect.fromCenter(
        center: lensCenter,
        width: lensW,
        height: lensH,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(lensH * 0.35)),
        lensPaint,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, Radius.circular(lensH * 0.35)),
        framePaint,
      );

      canvas.drawCircle(
        lensCenter + Offset(-lensW * 0.18, -lensH * 0.15),
        lensW * 0.1,
        Paint()..color = Colors.white.withValues(alpha: 0.35 * opacity),
      );
    }

    canvas.drawLine(
      leftLensCenter + Offset(lensW / 2, 0),
      rightLensCenter - Offset(lensW / 2, 0),
      framePaint..strokeWidth = face.bodyRadius * 0.03,
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(position.dx, position.dy - lensH * 0.55),
          width: bridgeW,
          height: lensH * 0.18,
        ),
        Radius.circular(bridgeW * 0.3),
      ),
      framePaint..style = PaintingStyle.fill,
    );
  }

  void _drawArm(
    Canvas canvas,
    Offset center,
    double bodyRadius,
    Offset hand,
    double amount,
  ) {
    if (amount <= 0) return;

    final shoulder = Offset(center.dx + bodyRadius * 0.55, center.dy + bodyRadius * 0.18);
    final elbow = Offset(
      shoulder.dx + (hand.dx - shoulder.dx) * 0.45,
      shoulder.dy + (hand.dy - shoulder.dy) * 0.35 - bodyRadius * 0.08,
    );

    final armPaint = Paint()
      ..color = _armColor.withValues(alpha: amount)
      ..strokeWidth = bodyRadius * 0.16
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    canvas.drawLine(shoulder, elbow, armPaint);
    canvas.drawLine(elbow, hand, armPaint);

    canvas.drawCircle(
      hand,
      bodyRadius * 0.13,
      Paint()..color = _handColor.withValues(alpha: amount),
    );

    canvas.drawCircle(
      hand,
      bodyRadius * 0.13,
      Paint()
        ..color = _armColor.withValues(alpha: amount * 0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = bodyRadius * 0.025,
    );
  }

  @override
  bool shouldRepaint(_KawaiiSunPainter oldDelegate) =>
      oldDelegate.revealProgress != revealProgress ||
      oldDelegate.blinkClosedAmount != blinkClosedAmount ||
      oldDelegate.ambient != ambient ||
      oldDelegate.weatherMood != weatherMood ||
      oldDelegate.rainPhase != rainPhase;
}
