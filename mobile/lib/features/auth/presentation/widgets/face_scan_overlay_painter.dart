import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/utils/face_guide_geometry.dart';

/// Oval face guide with green alignment, hold arc, and capture state.
class FaceScanOverlayPainter extends CustomPainter {
  FaceScanOverlayPainter({
    required this.progress,
    this.aligned = false,
    this.holdProgress = 0,
    this.isCapturing = false,
    this.instruction,
  });

  final double progress;
  final bool aligned;
  final double holdProgress;
  final bool isCapturing;
  final String? instruction;

  static const _green = Color(0xFF66BB6A);

  bool get _showGreen => aligned || holdProgress > 0 || isCapturing;

  @override
  void paint(Canvas canvas, Size size) {
    final guidePath = FaceGuideGeometry.buildFaceGuidePath(size);
    final bounds = guidePath.getBounds();
    final ovalCenter = bounds.center;
    final ovalRadius = math.max(bounds.width, bounds.height) / 2;

    final mask = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addPath(guidePath, Offset.zero)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(
      mask,
      Paint()..color = Colors.black.withValues(alpha: 0.52),
    );

    final borderColor = isCapturing
        ? _green
        : _showGreen
            ? _green
            : Colors.white.withValues(alpha: 0.95);

    if (_showGreen && !isCapturing) {
      canvas.drawPath(
        guidePath,
        Paint()
          ..color = _green.withValues(alpha: 0.12)
          ..style = PaintingStyle.fill,
      );
    }

    _drawDashedPath(
      canvas,
      guidePath,
      borderColor,
      _showGreen ? 3.5 : 3,
      solid: isCapturing,
    );

    if (holdProgress > 0 && !isCapturing) {
      _drawHoldArc(canvas, ovalCenter, ovalRadius, holdProgress);
    }

    final jawY = FaceGuideGeometry.jawGuideLineY(size);
    final jawPaint = Paint()
      ..color = _showGreen ? _green : AppColors.secondary.withValues(alpha: 0.45)
      ..strokeWidth = _showGreen ? 3.5 : 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(bounds.left + 18, jawY),
      Offset(bounds.right - 18, jawY),
      jawPaint,
    );

    if (!_showGreen) {
      final y = FaceGuideGeometry.scanLineY(size, progress);
      canvas.drawLine(
        Offset(bounds.left + 20, y),
        Offset(bounds.right - 20, y),
        Paint()
          ..color = AppColors.secondary.withValues(alpha: 0.4)
          ..strokeWidth = 2,
      );
    }

    final label = instruction ??
        (isCapturing
            ? 'Capturing photo…'
            : aligned
                ? 'Hold still — almost there…'
                : 'Center your face in the oval');
    _drawLabel(
      canvas,
      size,
      label,
      top: 28,
      color: _showGreen ? _green : Colors.white,
    );
  }

  void _drawHoldArc(Canvas canvas, Offset center, double radius, double value) {
    final rect = Rect.fromCircle(center: center, radius: radius + 6);
    final sweep = 2 * math.pi * value.clamp(0.0, 1.0);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      sweep,
      false,
      Paint()
        ..color = _green
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round,
    );
  }

  void _drawDashedPath(
    Canvas canvas,
    Path path,
    Color color,
    double strokeWidth, {
    bool solid = false,
  }) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    if (solid) {
      canvas.drawPath(path, paint);
      return;
    }

    for (final metric in path.computeMetrics()) {
      final length = metric.length;
      const dash = 10.0;
      const gap = 7.0;
      var distance = 0.0;
      while (distance < length) {
        final next = math.min(distance + dash, length);
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance += dash + gap;
      }
    }
  }

  void _drawLabel(
    Canvas canvas,
    Size size,
    String text, {
    required double top,
    Color color = Colors.white,
  }) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: color,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          shadows: const [Shadow(color: Colors.black54, blurRadius: 4)],
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: size.width - 32);

    final offset = Offset((size.width - tp.width) / 2, top);
    final bg = RRect.fromRectAndRadius(
      Rect.fromLTWH(offset.dx - 10, offset.dy - 4, tp.width + 20, tp.height + 8),
      const Radius.circular(20),
    );
    canvas.drawRRect(
      bg,
      Paint()..color = Colors.black.withValues(alpha: 0.35),
    );
    tp.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(FaceScanOverlayPainter old) =>
      old.progress != progress ||
      old.aligned != aligned ||
      old.holdProgress != holdProgress ||
      old.isCapturing != isCapturing ||
      old.instruction != instruction;
}
