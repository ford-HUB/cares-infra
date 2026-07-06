import 'dart:ui';

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:mobile/features/auth/presentation/utils/face_bbox_mapper.dart';
import 'package:mobile/features/auth/presentation/utils/face_camera_input_helper.dart';

/// Face guide overlay + liveness geometry (centered, not instant).
abstract final class FaceGuideGeometry {
  static const centerYNorm = 0.45;
  static const widthNorm = 0.62;
  static const heightNorm = 0.58;

  static Path buildFaceGuidePath(Size size) {
    final center = Offset(size.width / 2, size.height * centerYNorm);
    return Path()
      ..addOval(
        Rect.fromCenter(
          center: center,
          width: size.width * widthNorm,
          height: size.height * heightNorm,
        ),
      );
  }

  static bool isFaceDetectable(Face face, CameraFrameInput frame) {
    for (final n in FaceBboxMapper.normalizedVariants(face, frame)) {
      if (_detectable(n)) return true;
    }
    return false;
  }

  /// Chin on jaw line + face roughly inside oval (center step).
  static bool isJawInOvalZone(Face face, CameraFrameInput frame) {
    for (final n in FaceBboxMapper.normalizedVariants(face, frame)) {
      if (_jawOk(n)) return true;
    }
    return false;
  }

  /// Face centered in oval — required before center / final capture.
  static bool isFaceCenteredInOval(Face face, CameraFrameInput frame) {
    for (final n in FaceBboxMapper.normalizedVariants(face, frame)) {
      if (_centeredInOval(n)) return true;
    }
    return false;
  }

  static bool isReadyForCapture(Face face, CameraFrameInput frame) {
    return isFaceCenteredInOval(face, frame);
  }

  static bool _detectable(Rect n) {
    final area = n.width * n.height;
    return area >= 0.04 && area <= 0.85;
  }

  static bool _jawOk(Rect n) {
    final cx = (n.left + n.right) / 2;
    final top = n.top;
    final bottom = n.bottom;
    final fw = n.width;
    final fh = n.height;

    if (fw < 0.12 || fh < 0.14) return false;
    if (cx < 0.22 || cx > 0.78) return false;
    if (bottom < 0.30 || bottom > 0.82) return false;
    if (top > 0.68) return false;

    final jawY = centerYNorm + heightNorm * 0.22;
    return (bottom - jawY).abs() < 0.14;
  }

  static bool _centeredInOval(Rect n) {
    if (!_jawOk(n)) return false;

    final cx = (n.left + n.right) / 2;
    final cy = (n.top + n.bottom) / 2;

    if (cx < 0.36 || cx > 0.64) return false;
    if (cy < 0.32 || cy > 0.58) return false;
    if (n.width < 0.28 || n.width > 0.68) return false;
    if (n.height < 0.32 || n.height > 0.72) return false;

    return true;
  }

  static double jawGuideLineY(Size size) {
    final c = size.height * centerYNorm;
    final h = size.height * heightNorm;
    return c + h * 0.22;
  }

  static double scanLineY(Size size, double progress) {
    final c = size.height * centerYNorm;
    final h = size.height * heightNorm;
    return c - h * 0.45 + h * 0.88 * progress;
  }
}
