import 'dart:io';

import 'package:permission_handler/permission_handler.dart';

/// Requests camera / gallery permissions before [ImagePicker] on mobile.
class MediaPermissions {
  const MediaPermissions._();

  static Future<MediaPermissionResult> ensureCamera() async {
    if (!_isMobile) {
      return const MediaPermissionResult.granted();
    }

    final status = await Permission.camera.request();
    if (status.isGranted) {
      return const MediaPermissionResult.granted();
    }
    if (status.isPermanentlyDenied || status.isRestricted) {
      return MediaPermissionResult.denied(
        message: 'Camera access is blocked. Enable it in app settings.',
        openSettings: true,
      );
    }
    return const MediaPermissionResult.denied(
      message: 'Camera permission is required to take a photo of your ID.',
    );
  }

  static Future<MediaPermissionResult> ensureGallery() async {
    if (!_isMobile) {
      return const MediaPermissionResult.granted();
    }

    if (Platform.isIOS) {
      final photos = await Permission.photos.request();
      if (photos.isGranted || photos.isLimited) {
        return const MediaPermissionResult.granted();
      }
      if (photos.isPermanentlyDenied || photos.isRestricted) {
        return MediaPermissionResult.denied(
          message: 'Photo library access is blocked. Enable it in app settings.',
          openSettings: true,
        );
      }
      return const MediaPermissionResult.denied(
        message: 'Photo library permission is required to choose your ID image.',
      );
    }

    // Android 13+ (API 33)
    final photos = await Permission.photos.status;
    if (photos.isGranted) {
      return const MediaPermissionResult.granted();
    }

    final photosRequest = await Permission.photos.request();
    if (photosRequest.isGranted) {
      return const MediaPermissionResult.granted();
    }

    // Android 12 and below
    final storage = await Permission.storage.status;
    if (storage.isGranted) {
      return const MediaPermissionResult.granted();
    }

    final storageRequest = await Permission.storage.request();
    if (storageRequest.isGranted) {
      return const MediaPermissionResult.granted();
    }

    final denied = photosRequest.isPermanentlyDenied ||
        storageRequest.isPermanentlyDenied;
    if (denied) {
      return MediaPermissionResult.denied(
        message: 'Storage access is blocked. Enable it in app settings.',
        openSettings: true,
      );
    }

    return const MediaPermissionResult.denied(
      message: 'Permission is required to open your gallery.',
    );
  }

  static bool get _isMobile => Platform.isAndroid || Platform.isIOS;
}

class MediaPermissionResult {
  const MediaPermissionResult._({
    required this.isGranted,
    this.message,
    this.openSettings = false,
  });

  const MediaPermissionResult.granted()
      : this._(isGranted: true);

  const MediaPermissionResult.denied({
    required String message,
    bool openSettings = false,
  }) : this._(
          isGranted: false,
          message: message,
          openSettings: openSettings,
        );

  final bool isGranted;
  final String? message;
  final bool openSettings;
}
