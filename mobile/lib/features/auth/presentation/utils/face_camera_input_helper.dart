import 'dart:io';
import 'dart:ui';

import 'package:camera/camera.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// Camera frame packaged for ML Kit with correct analysis dimensions.
class CameraFrameInput {
  const CameraFrameInput({
    required this.inputImage,
    required this.analysisSize,
    required this.rotation,
  });

  final InputImage inputImage;

  /// Upright coordinate space for [Face.boundingBox] normalization.
  final Size analysisSize;
  final InputImageRotation rotation;
}

/// Converts [CameraImage] frames to ML Kit [InputImage].
class FaceCameraInputHelper {
  const FaceCameraInputHelper._();

  static const _orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  static CameraFrameInput? fromCameraImage(
    CameraImage image,
    CameraController controller,
  ) {
    final camera = controller.description;
    final rotation = _rotation(camera, controller.value.deviceOrientation);
    if (rotation == null) return null;

    final rawSize = Size(image.width.toDouble(), image.height.toDouble());
    final inputImage = _buildInputImage(image, rotation);
    if (inputImage == null) return null;

    return CameraFrameInput(
      inputImage: inputImage,
      analysisSize: _uprightSize(rawSize, rotation),
      rotation: rotation,
    );
  }

  static InputImage? _buildInputImage(
    CameraImage image,
    InputImageRotation rotation,
  ) {
    final rawSize = Size(image.width.toDouble(), image.height.toDouble());
    final format = InputImageFormatValue.fromRawValue(image.format.raw);

    if (Platform.isAndroid) {
      // Single-plane NV21 (legacy camera_android).
      if (image.planes.length == 1 &&
          (format == InputImageFormat.nv21 || format == null)) {
        final plane = image.planes.first;
        return InputImage.fromBytes(
          bytes: plane.bytes,
          metadata: InputImageMetadata(
            size: rawSize,
            rotation: rotation,
            format: InputImageFormat.nv21,
            bytesPerRow: plane.bytesPerRow,
          ),
        );
      }

      // YUV_420_888 (camera_android_camerax) — convert to NV21 for ML Kit.
      if (image.planes.length >= 3) {
        return InputImage.fromBytes(
          bytes: _nv21FromYuv420(image),
          metadata: InputImageMetadata(
            size: rawSize,
            rotation: rotation,
            format: InputImageFormat.nv21,
            bytesPerRow: image.planes[0].bytesPerRow,
          ),
        );
      }
    }

    if (image.planes.isEmpty) return null;

    final plane = image.planes.first;
    final resolvedFormat = format ?? InputImageFormat.bgra8888;
    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: rawSize,
        rotation: rotation,
        format: resolvedFormat,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  /// ML Kit official rotation for Android/iOS camera streams.
  static InputImageRotation? _rotation(
    CameraDescription camera,
    DeviceOrientation orientation,
  ) {
    if (Platform.isIOS) {
      return InputImageRotationValue.fromRawValue(camera.sensorOrientation);
    }

    var rotationCompensation = _orientations[orientation];
    if (rotationCompensation == null) return null;

    if (camera.lensDirection == CameraLensDirection.front) {
      rotationCompensation =
          (camera.sensorOrientation + rotationCompensation) % 360;
    } else {
      rotationCompensation =
          (camera.sensorOrientation - rotationCompensation + 360) % 360;
    }
    return InputImageRotationValue.fromRawValue(rotationCompensation);
  }

  static Size _uprightSize(Size raw, InputImageRotation rotation) {
    final deg = rotation.rotationDegrees;
    if (deg == 90 || deg == 270) {
      return Size(raw.height, raw.width);
    }
    return raw;
  }

  static Uint8List _nv21FromYuv420(CameraImage image) {
    final width = image.width;
    final height = image.height;
    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];

    final nv21 = Uint8List(width * height + (width * height ~/ 2));
    var offset = 0;

    for (var row = 0; row < height; row++) {
      final rowStart = row * yPlane.bytesPerRow;
      nv21.setRange(offset, offset + width, yPlane.bytes, rowStart);
      offset += width;
    }

    final uvHeight = height ~/ 2;
    final uvWidth = width ~/ 2;
    final uPixelStride = uPlane.bytesPerPixel ?? 1;
    final vPixelStride = vPlane.bytesPerPixel ?? 1;

    for (var row = 0; row < uvHeight; row++) {
      for (var col = 0; col < uvWidth; col++) {
        final uIndex = row * uPlane.bytesPerRow + col * uPixelStride;
        final vIndex = row * vPlane.bytesPerRow + col * vPixelStride;
        nv21[offset++] = vPlane.bytes[vIndex];
        nv21[offset++] = uPlane.bytes[uIndex];
      }
    }

    return nv21;
  }
}

extension on InputImageRotation {
  int get rotationDegrees => switch (this) {
        InputImageRotation.rotation0deg => 0,
        InputImageRotation.rotation90deg => 90,
        InputImageRotation.rotation180deg => 180,
        InputImageRotation.rotation270deg => 270,
      };
}
