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
import 'package:mobile/features/auth/presentation/utils/face_liveness_checker.dart';
import 'package:mobile/features/auth/presentation/widgets/face_scan_overlay_painter.dart';
import 'package:mobile/features/auth/presentation/widgets/unmirrored_face_image.dart';
import 'package:permission_handler/permission_handler.dart';

/// Step 2: capture center, blink, left, right, final — thumbnails below camera.
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
  final _liveness = FaceLivenessChecker();
  final _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      performanceMode: FaceDetectorMode.fast,
      enableLandmarks: true,
      enableContours: false,
      enableClassification: true,
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
  double _holdProgress = 0;

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
    _liveness.reset();

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
        if (_liveness.phase != FaceLivenessPhase.finished) {
          _liveness.tickWithoutFace();
        }
        if (mounted && (_faceSeen || _faceInGuide || _holdProgress > 0)) {
          setState(() {
            _faceSeen = false;
            _faceInGuide = false;
            _holdProgress = 0;
          });
        }
        return;
      }

      final face = _largestFace(faces);
      final centered = FaceGuideGeometry.isFaceCenteredInOval(face, frame);
      final jawAligned = FaceGuideGeometry.isJawInOvalZone(face, frame);
      final highlight = switch (_liveness.phase) {
        FaceLivenessPhase.center || FaceLivenessPhase.finalCapture =>
          centered || jawAligned,
        FaceLivenessPhase.blink => jawAligned,
        FaceLivenessPhase.turnLeft ||
        FaceLivenessPhase.turnRight =>
          FaceGuideGeometry.isFaceDetectable(face, frame),
        FaceLivenessPhase.finished => false,
      };

      if (_liveness.phase != FaceLivenessPhase.finished) {
        _liveness.update(face, frame);
      }

      final completed = _liveness.consumeCompletedPhase();
      if (completed != null) {
        await _captureStepShot(completed);
      }

      if (mounted) {
        setState(() {
          _faceSeen = true;
          _faceInGuide = highlight;
          _holdProgress = _liveness.holdProgress;
        });
      }
    } catch (e) {
      debugPrint('Face detection error: $e');
    } finally {
      _isProcessingFrame = false;
    }
  }

  bool get _hasAnyCapture => _captures.shots.any((s) => s != null);

  Future<void> _showShotPreview(int index) async {
    final file = _captures.shots[index];
    if (file == null || !mounted) return;

    await showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => _FaceShotPreviewDialog(
        label: FaceCaptureSet.labels[index],
        filePath: file.path,
        onRetryAll: () {
          Navigator.pop(ctx);
          unawaited(_retryFaceCapture());
        },
      ),
    );
  }

  Future<void> _retryFaceCapture() async {
    if (_isCapturing || !_hasAnyCapture) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Retry face scan?'),
        content: const Text(
          'All captured face photos will be cleared and you will start '
          'the scan again from the beginning.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Retry'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    widget.onCapturesChanged(const FaceCaptureSet());
    _liveness.reset();
    _useSystemFallback = false;
    _faceSeen = false;
    _faceInGuide = false;
    _holdProgress = 0;
    _errorMessage = null;
    _permissionDenied = false;

    await _disposeCamera();
    if (!mounted) return;

    setState(() {});
    await _openInAppCamera();
  }

  Future<void> _captureCurrentStepManually() async {
    if (_isCapturing || widget.captures.isComplete) return;
    final step = _liveness.phase;
    if (step == FaceLivenessPhase.finished) return;
    _liveness.forceCompleteCurrentPhase();
    final completed = _liveness.consumeCompletedPhase();
    if (completed != null) {
      await _captureStepShot(completed);
    }
  }

  Future<void> _captureStepShot(FaceLivenessPhase step) async {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized || _isCapturing) {
      return;
    }

    setState(() => _isCapturing = true);
    final wasStreaming = controller.value.isStreamingImages;
    if (wasStreaming) await _stopImageStream();

    try {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      final file = await controller.takePicture();
      if (!mounted) return;

      final updated = _assignCapture(step, file);
      widget.onCapturesChanged(updated);

      if (updated.isComplete) {
        await _disposeCamera();
      } else if (wasStreaming && mounted) {
        await _startFaceDetection();
      }
    } catch (e) {
      debugPrint('Step capture failed: $e');
      if (mounted) {
        setState(() => _errorMessage = 'Could not save photo. Retrying…');
      }
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  FaceCaptureSet _assignCapture(FaceLivenessPhase step, XFile file) {
    return switch (step) {
      FaceLivenessPhase.center => _captures.copyWith(center: file),
      FaceLivenessPhase.blink => _captures.copyWith(blink: file),
      FaceLivenessPhase.turnLeft => _captures.copyWith(left: file),
      FaceLivenessPhase.turnRight => _captures.copyWith(right: file),
      FaceLivenessPhase.finalCapture => _captures.copyWith(finalShot: file),
      FaceLivenessPhase.finished => _captures,
    };
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
        widget.onCapturesChanged(
          const FaceCaptureSet().copyWith(center: file, finalShot: file),
        );
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
    final shotCount = _captures.shots.where((s) => s != null).length;

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
              ? 'All face photos captured ($shotCount/5).'
              : !_faceSeen && _cameraController != null
                  ? 'Looking for your face… move into the outline'
                  : _liveness.instruction,
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: allDone
                ? const Color(0xFF66BB6A)
                : AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
        if (!allDone && !_useSystemFallback) ...[
          const SizedBox(height: 12),
          _LivenessStepRow(
            captures: _captures,
            activeIndex: _liveness.activeStepIndex,
          ),
        ],
        const SizedBox(height: 16),
        AspectRatio(
          aspectRatio: 3 / 4,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: _buildPreview(allDone, scan),
          ),
        ),
        const SizedBox(height: 16),
        _CapturedShotsGallery(
          captures: _captures,
          onShotTap: _showShotPreview,
        ),
        if (_hasAnyCapture) ...[
          const SizedBox(height: 6),
          Text(
            'Tap a photo to preview',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.secondary.withValues(alpha: 0.85),
            ),
          ),
        ],
        const SizedBox(height: 12),
        if (_hasAnyCapture)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _isCapturing || _isStarting
                  ? null
                  : () => unawaited(_retryFaceCapture()),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry face scan'),
            ),
          ),
        if (_hasAnyCapture) const SizedBox(height: 12),
        if (!allDone &&
            !_useSystemFallback &&
            _cameraController != null &&
            _liveness.phase.allowsManualCapture) ...[
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _isCapturing
                  ? null
                  : () => unawaited(_captureCurrentStepManually()),
              icon: const Icon(Icons.camera_alt_outlined),
              label: Text(
                'Capture ${FaceCaptureSet.labels[_liveness.activeStepIndex]} manually',
              ),
            ),
          ),
        ],
        if (!allDone && !_useSystemFallback && _cameraController != null)
          TextButton(
            onPressed: _isCapturing ? null : () => unawaited(_openSystemCameraWithGuide()),
            child: const Text('Use system camera instead'),
          ),
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
    if (allDone && _captures.finalShot != null) {
      return GestureDetector(
        onTap: () => unawaited(_showShotPreview(4)),
        child: Stack(
          fit: StackFit.expand,
          children: [
            UnmirroredFaceImage(filePath: _captures.finalShot!.path),
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
    final showLoader = _isCapturing || (_faceInGuide && _holdProgress > 0);
    final instruction = _overlayInstruction();

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
                holdProgress: _holdProgress,
                isCapturing: _isCapturing,
                instruction: instruction,
              ),
            ),
          ),
        if (showLoader)
          Center(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.45),
                shape: BoxShape.circle,
              ),
              child: SizedBox(
                width: 44,
                height: 44,
                child: CircularProgressIndicator(
                  value: _isCapturing ? null : _holdProgress.clamp(0.05, 1.0),
                  strokeWidth: 4,
                  color: const Color(0xFF66BB6A),
                  backgroundColor: Colors.white24,
                ),
              ),
            ),
          ),
      ],
    );
  }

  String _overlayInstruction() {
    if (_isCapturing) return 'Capturing photo…';
    if (_faceInGuide) {
      return switch (_liveness.phase) {
        FaceLivenessPhase.center => 'Face aligned — hold still…',
        FaceLivenessPhase.blink => 'Blink detected — hold…',
        FaceLivenessPhase.turnLeft || FaceLivenessPhase.turnRight =>
          'Good — keep holding turn…',
        FaceLivenessPhase.finalCapture => 'Aligned — hold for final photo…',
        FaceLivenessPhase.finished => _liveness.instruction,
      };
    }
    return _liveness.instruction;
  }
}

class _LivenessStepRow extends StatelessWidget {
  const _LivenessStepRow({
    required this.captures,
    required this.activeIndex,
  });

  final FaceCaptureSet captures;
  final int activeIndex;

  @override
  Widget build(BuildContext context) {
    final shots = captures.shots;
    return Row(
      children: List.generate(FaceCaptureSet.labels.length, (i) {
        final done = shots[i] != null;
        final current = !done && i == activeIndex;
        return Expanded(
          child: Column(
            children: [
              Icon(
                done
                    ? Icons.check_circle
                    : current
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                size: 18,
                color: done
                    ? const Color(0xFF66BB6A)
                    : current
                        ? AppColors.primary
                        : AppColors.fieldBorder,
              ),
              const SizedBox(height: 4),
              Text(
                FaceCaptureSet.labels[i],
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: current ? FontWeight.w700 : FontWeight.w500,
                  color: done
                      ? const Color(0xFF66BB6A)
                      : current
                          ? AppColors.primaryDark
                          : AppColors.secondary.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

class _CapturedShotsGallery extends StatelessWidget {
  const _CapturedShotsGallery({
    required this.captures,
    required this.onShotTap,
  });

  final FaceCaptureSet captures;
  final void Function(int index) onShotTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Captured photos',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.primaryDark.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 88,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: FaceCaptureSet.labels.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final file = captures.shots[i];
              final label = FaceCaptureSet.labels[i];
              return _ShotThumb(
                label: label,
                file: file,
                onTap: file != null ? () => onShotTap(i) : null,
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ShotThumb extends StatelessWidget {
  const _ShotThumb({
    required this.label,
    required this.file,
    this.onTap,
  });

  final String label;
  final XFile? file;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final image = file != null
        ? UnmirroredFaceImage(filePath: file!.path)
        : ColoredBox(
            color: AppColors.fieldBorder.withValues(alpha: 0.5),
            child: Center(
              child: Icon(
                Icons.face_retouching_natural,
                color: AppColors.secondary.withValues(alpha: 0.5),
                size: 28,
              ),
            ),
          );

    return SizedBox(
      width: 72,
      child: Column(
        children: [
          Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(10),
                child: Ink(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: file != null
                        ? Border.all(
                            color: const Color(0xFF66BB6A).withValues(alpha: 0.6),
                            width: 1.5,
                          )
                        : null,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        image,
                        if (file != null)
                          const Align(
                            alignment: Alignment.bottomRight,
                            child: Padding(
                              padding: EdgeInsets.all(4),
                              child: Icon(
                                Icons.zoom_in,
                                size: 16,
                                color: Colors.white,
                                shadows: [
                                  Shadow(color: Colors.black54, blurRadius: 4),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: file != null
                  ? const Color(0xFF66BB6A)
                  : AppColors.secondary.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

class _FaceShotPreviewDialog extends StatelessWidget {
  const _FaceShotPreviewDialog({
    required this.label,
    required this.filePath,
    required this.onRetryAll,
  });

  final String label;
  final String filePath;
  final VoidCallback onRetryAll;

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
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
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
                    onPressed: onRetryAll,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Retry scan'),
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
