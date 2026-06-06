import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/camera_bootstrap.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/utils/media_permissions.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/presentation/utils/face_camera_input_helper.dart';
import 'package:mobile/features/auth/presentation/utils/face_guide_geometry.dart';
import 'package:mobile/features/auth/presentation/widgets/face_scan_overlay_painter.dart';
import 'package:mobile/features/auth/presentation/widgets/unmirrored_face_image.dart';
import 'package:permission_handler/permission_handler.dart';

/// Step 2: single face photo with oval guide and alignment feedback.
class RegisterFaceScanStep extends StatefulWidget {
  const RegisterFaceScanStep({
    super.key,
    required this.captures,
    required this.onCapturesChanged,
  });

  final FaceCaptureSet captures;
  final ValueChanged<FaceCaptureSet> onCapturesChanged;

  @override
  State<RegisterFaceScanStep> createState() => _RegisterFaceScanStepState();
}

class _RegisterFaceScanStepState extends State<RegisterFaceScanStep>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  static const _frameThrottle = Duration(milliseconds: 100);

  final _picker = ImagePicker();
  final _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      performanceMode: FaceDetectorMode.fast,
      enableLandmarks: true,
      enableContours: false,
      enableClassification: false,
      enableTracking: true,
      minFaceSize: 0.05,
    ),
  );

  CameraController? _cameraController;
  AnimationController? _scanController;

  String? _errorMessage;
  bool _permissionDenied = false;
  bool _isStarting = false;
  bool _isCapturing = false;
  bool _useSystemFallback = false;
  bool _isProcessingFrame = false;
  DateTime? _lastFrameProcessed;
  bool _faceSeen = false;
  bool _faceInGuide = false;

  FaceCaptureSet get _captures => widget.captures;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();

    if (!widget.captures.isComplete) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        unawaited(_openInAppCamera());
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scanController?.dispose();
    unawaited(_disposeCamera());
    unawaited(_faceDetector.close());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      unawaited(_disposeCamera());
    } else if (state == AppLifecycleState.resumed &&
        !widget.captures.isComplete &&
        !_useSystemFallback) {
      unawaited(_openInAppCamera());
    }
  }

  Future<void> _stopImageStream() async {
    final c = _cameraController;
    if (c == null || !c.value.isInitialized) return;
    if (!c.value.isStreamingImages) return;
    try {
      await c.stopImageStream();
    } catch (_) {}
  }

  Future<void> _disposeCamera() async {
    await _stopImageStream();
    final c = _cameraController;
    _cameraController = null;
    if (c == null) return;
    try {
      await c.dispose();
    } catch (_) {}
  }

  Future<void> _openInAppCamera() async {
    if (_isStarting || widget.captures.isComplete) return;
    _isStarting = true;
    _useSystemFallback = false;

    setState(() {
      _errorMessage = null;
      _permissionDenied = false;
    });

    final permission = await MediaPermissions.ensureCamera();
    if (!mounted) {
      _isStarting = false;
      return;
    }

    if (!permission.isGranted) {
      setState(() {
        _permissionDenied = true;
        _errorMessage = permission.message;
        _isStarting = false;
      });
      return;
    }

    await Future<void>.delayed(const Duration(milliseconds: 400));
    await _disposeCamera();

    try {
      final cameras = await CameraBootstrap.getCameras();
      if (cameras.isEmpty) throw Exception('No camera');

      final front = CameraBootstrap.frontCamera ?? cameras.first;
      final controller = CameraController(
        front,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.yuv420
            : ImageFormatGroup.bgra8888,
      );

      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }

      _cameraController = controller;
      setState(() => _isStarting = false);
      await _startFaceDetection();
    } catch (e) {
      debugPrint('In-app camera failed: $e');
      if (mounted) {
        setState(() => _isStarting = false);
        await _openSystemCameraWithGuide();
      }
    }
  }

  Future<void> _startFaceDetection() async {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      await controller.startImageStream(_onCameraFrame);
    } catch (e) {
      debugPrint('Image stream failed: $e');
    }
  }

  Future<void> _onCameraFrame(CameraImage image) async {
    if (_isCapturing || _isProcessingFrame || widget.captures.isComplete) return;

    final now = DateTime.now();
    if (_lastFrameProcessed != null &&
        now.difference(_lastFrameProcessed!) < _frameThrottle) {
      return;
    }
    _lastFrameProcessed = now;
    _isProcessingFrame = true;

    try {
      final controller = _cameraController;
      if (controller == null) return;

      final frame = FaceCameraInputHelper.fromCameraImage(image, controller);
      if (frame == null) return;

      final faces = await _faceDetector.processImage(frame.inputImage);
      if (!mounted || _isCapturing) return;

      if (faces.isEmpty) {
        if (mounted && (_faceSeen || _faceInGuide)) {
          setState(() {
            _faceSeen = false;
            _faceInGuide = false;
          });
        }
        return;
      }

      final face = _largestFace(faces);
      final centered = FaceGuideGeometry.isFaceCenteredInOval(face, frame);
      final jawAligned = FaceGuideGeometry.isJawInOvalZone(face, frame);
      final aligned = centered || jawAligned;

      if (mounted) {
        setState(() {
          _faceSeen = true;
          _faceInGuide = aligned;
        });
      }
    } catch (e) {
      debugPrint('Face detection error: $e');
    } finally {
      _isProcessingFrame = false;
    }
  }

  Future<void> _showShotPreview() async {
    final file = _captures.photo;
    if (file == null || !mounted) return;

    await showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => _FaceShotPreviewDialog(
        filePath: file.path,
        onRetry: () {
          Navigator.pop(ctx);
          unawaited(_retryFaceCapture());
        },
      ),
    );
  }

  Future<void> _retryFaceCapture() async {
    if (_isCapturing) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Retake face photo?'),
        content: const Text(
          'Your captured photo will be cleared so you can take a new one.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Retake'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    widget.onCapturesChanged(const FaceCaptureSet());
    _faceSeen = false;
    _faceInGuide = false;
    _errorMessage = null;
    _permissionDenied = false;
    _useSystemFallback = false;

    await _disposeCamera();
    if (!mounted) return;

    setState(() {});
    await _openInAppCamera();
  }

  Future<void> _capturePhoto() async {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized || _isCapturing) {
      return;
    }

    setState(() => _isCapturing = true);
    final wasStreaming = controller.value.isStreamingImages;
    if (wasStreaming) await _stopImageStream();

    try {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      final file = await controller.takePicture();
      if (!mounted) return;

      widget.onCapturesChanged(_captures.copyWith(photo: file));
      await _disposeCamera();
    } catch (e) {
      debugPrint('Capture failed: $e');
      if (mounted) {
        setState(() => _errorMessage = 'Could not save photo. Please try again.');
        if (wasStreaming) await _startFaceDetection();
      }
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  Face _largestFace(List<Face> faces) {
    return faces.reduce(
      (a, b) =>
          a.boundingBox.width * a.boundingBox.height >
                  b.boundingBox.width * b.boundingBox.height
              ? a
              : b,
    );
  }

  Future<void> _openSystemCameraWithGuide() async {
    if (!mounted) return;
    final proceed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _SystemCameraGuideDialog(scanProgress: _scanController),
    );
    if (proceed != true || !mounted) return;

    await _disposeCamera();
    _useSystemFallback = true;
    setState(() {});

    final permission = await MediaPermissions.ensureCamera();
    if (!permission.isGranted) {
      setState(() {
        _permissionDenied = true;
        _errorMessage = permission.message;
      });
      return;
    }

    setState(() => _isCapturing = true);
    try {
      final file = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 90,
      );
      if (!mounted) return;
      if (file != null) {
        widget.onCapturesChanged(_captures.copyWith(photo: file));
      } else {
        setState(() => _errorMessage = 'Face photo required.');
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = 'Could not open camera.');
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final allDone = _captures.isComplete;
    final scan = _scanController;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Face verification',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          allDone
              ? 'Face photo captured.'
              : !_faceSeen && _cameraController != null
                  ? 'Looking for your face… move into the outline'
                  : _faceInGuide
                      ? 'Face aligned — tap Capture when ready'
                      : 'Center your face in the oval',
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: allDone
                ? const Color(0xFF66BB6A)
                : AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 16),
        AspectRatio(
          aspectRatio: 3 / 4,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: _buildPreview(allDone, scan),
          ),
        ),
        const SizedBox(height: 16),
        if (allDone)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _isCapturing || _isStarting
                  ? null
                  : () => unawaited(_retryFaceCapture()),
              icon: const Icon(Icons.refresh),
              label: const Text('Retake photo'),
            ),
          ),
        if (!allDone &&
            !_useSystemFallback &&
            _cameraController != null) ...[
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isCapturing ? null : () => unawaited(_capturePhoto()),
              icon: const Icon(Icons.camera_alt_outlined),
              label: Text(_isCapturing ? 'Capturing…' : 'Capture'),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _isCapturing ? null : () => unawaited(_openSystemCameraWithGuide()),
            child: const Text('Use system camera instead'),
          ),
        ],
        if (!allDone && (_useSystemFallback || _cameraController == null))
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isCapturing ? null : () => unawaited(_openSystemCameraWithGuide()),
              icon: const Icon(Icons.camera_front_outlined),
              label: const Text('Open camera with guide'),
            ),
          ),
        if (_errorMessage != null && !allDone) ...[
          const SizedBox(height: 8),
          Text(
            _errorMessage!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.heart, fontSize: 13),
          ),
          if (_permissionDenied)
            TextButton.icon(
              onPressed: openAppSettings,
              icon: const Icon(Icons.settings),
              label: const Text('Open settings'),
            ),
        ],
      ],
    );
  }

  Widget _buildPreview(bool allDone, AnimationController? scan) {
    if (allDone && _captures.photo != null) {
      return GestureDetector(
        onTap: () => unawaited(_showShotPreview()),
        child: Stack(
          fit: StackFit.expand,
          children: [
            UnmirroredFaceImage(filePath: _captures.photo!.path),
            Container(color: AppColors.primary.withValues(alpha: 0.15)),
            const Center(
              child: Icon(Icons.check_circle, color: Colors.white, size: 72),
            ),
            Positioned(
              right: 12,
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.zoom_in, color: Colors.white, size: 18),
                    SizedBox(width: 6),
                    Text(
                      'Tap to preview',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_isStarting) {
      return ColoredBox(
        color: const Color(0xFF263238),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: AppColors.secondary),
              const SizedBox(height: 12),
              Text(
                'Opening camera…',
                style: const TextStyle(color: Colors.white70),
              ),
            ],
          ),
        ),
      );
    }

    if (_useSystemFallback) {
      return const ColoredBox(
        color: Color(0xFF263238),
        child: Center(
          child: Text(
            'Use system camera to continue',
            style: TextStyle(color: Colors.white70),
          ),
        ),
      );
    }

    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized) {
      return const ColoredBox(
        color: Color(0xFF263238),
        child: Center(child: CircularProgressIndicator(color: AppColors.secondary)),
      );
    }

    return _buildLiveCameraStack(controller, scan);
  }

  Widget _buildLiveCameraStack(CameraController controller, AnimationController? scan) {
    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(controller),
        if (scan != null)
          AnimatedBuilder(
            animation: scan,
            builder: (context, child) => CustomPaint(
              painter: FaceScanOverlayPainter(
                progress: scan.value,
                aligned: _faceInGuide,
                isCapturing: _isCapturing,
                instruction: _overlayInstruction(),
              ),
            ),
          ),
        if (_isCapturing)
          Center(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.45),
                shape: BoxShape.circle,
              ),
              child: const SizedBox(
                width: 44,
                height: 44,
                child: CircularProgressIndicator(
                  strokeWidth: 4,
                  color: Color(0xFF66BB6A),
                ),
              ),
            ),
          ),
      ],
    );
  }

  String _overlayInstruction() {
    if (_isCapturing) return 'Capturing photo…';
    if (_faceInGuide) return 'Face aligned — tap Capture';
    if (_faceSeen) return 'Adjust position to align with the oval';
    return 'Center your face in the oval';
  }
}

class _FaceShotPreviewDialog extends StatelessWidget {
  const _FaceShotPreviewDialog({
    required this.filePath,
    required this.onRetry,
  });

  final String filePath;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1E272C),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Face photo',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white70),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 3 / 4,
                child: InteractiveViewer(
                  minScale: 1,
                  maxScale: 4,
                  child: UnmirroredFaceImage(
                    filePath: filePath,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white70,
                      side: const BorderSide(color: Colors.white24),
                    ),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Retake'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SystemCameraGuideDialog extends StatelessWidget {
  const _SystemCameraGuideDialog({required this.scanProgress});

  final AnimationController? scanProgress;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF263238),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Face photo guide',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Center your face in the frame and tap the shutter.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white70,
                      side: const BorderSide(color: Colors.white24),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Open camera'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
