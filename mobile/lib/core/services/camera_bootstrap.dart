import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';

/// Preloads device cameras once at app start to reduce step-2 failures.
class CameraBootstrap {
  CameraBootstrap._();

  static List<CameraDescription>? _cameras;
  static bool _loaded = false;

  static List<CameraDescription>? get cameras => _cameras;

  static Future<void> preload() async {
    if (_loaded) return;
    _loaded = true;
    try {
      _cameras = await availableCameras();
    } catch (e, stack) {
      debugPrint('CameraBootstrap.preload failed: $e\n$stack');
      _cameras = [];
    }
  }

  static Future<List<CameraDescription>> getCameras({int retries = 3}) async {
    if (_cameras != null && _cameras!.isNotEmpty) {
      return _cameras!;
    }

    for (var attempt = 0; attempt < retries; attempt++) {
      try {
        _cameras = await availableCameras();
        if (_cameras != null && _cameras!.isNotEmpty) {
          return _cameras!;
        }
      } catch (e) {
        debugPrint('availableCameras attempt ${attempt + 1} failed: $e');
      }
      await Future<void>.delayed(Duration(milliseconds: 500 * (attempt + 1)));
    }

    return _cameras ?? [];
  }

  static CameraDescription? get frontCamera {
    final list = _cameras;
    if (list == null || list.isEmpty) return null;
    for (final camera in list) {
      if (camera.lensDirection == CameraLensDirection.front) {
        return camera;
      }
    }
    return list.first;
  }
}
