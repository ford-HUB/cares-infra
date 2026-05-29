import 'dart:ui';

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:mobile/features/auth/presentation/utils/face_camera_input_helper.dart';

/// Maps ML Kit face boxes into 0–1 portrait-normalized coordinates.
abstract final class FaceBboxMapper {
  static Rect toNormalized(Face face, CameraFrameInput frame) {
    final box = face.boundingBox;
    final w = frame.inputImage.metadata!.size.width;
    final h = frame.inputImage.metadata!.size.height;
    final deg = _rotationDegrees(frame.rotation);

    double left;
    double top;
    double right;
    double bottom;

    switch (deg) {
      case 90:
        left = box.top / h;
        top = (w - box.right) / w;
        right = box.bottom / h;
        bottom = (w - box.left) / w;
      case 270:
        left = (h - box.bottom) / h;
        top = box.left / w;
        right = (h - box.top) / h;
        bottom = box.right / w;
      case 180:
        left = (w - box.right) / w;
        top = (h - box.bottom) / h;
        right = (w - box.left) / w;
        bottom = (h - box.top) / h;
      default:
        left = box.left / w;
        top = box.top / h;
        right = box.right / w;
        bottom = box.bottom / h;
    }

    return Rect.fromLTRB(
      left.clamp(0.0, 1.0),
      top.clamp(0.0, 1.0),
      right.clamp(0.0, 1.0),
      bottom.clamp(0.0, 1.0),
    );
  }

  /// Front-camera preview is mirrored; try both for geometry checks.
  static List<Rect> normalizedVariants(Face face, CameraFrameInput frame) {
    final n = toNormalized(face, frame);
    return [
      n,
      Rect.fromLTRB(1 - n.right, n.top, 1 - n.left, n.bottom),
    ];
  }

  static int _rotationDegrees(InputImageRotation rotation) => switch (rotation) {
        InputImageRotation.rotation0deg => 0,
        InputImageRotation.rotation90deg => 90,
        InputImageRotation.rotation180deg => 180,
        InputImageRotation.rotation270deg => 270,
      };
}
