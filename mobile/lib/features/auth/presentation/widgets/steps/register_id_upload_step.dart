import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/utils/media_permissions.dart';
import 'package:permission_handler/permission_handler.dart';

enum IdCardSide { front, back }

class RegisterIdUploadStep extends StatefulWidget {
  const RegisterIdUploadStep({
    super.key,
    required this.frontImage,
    required this.backImage,
    required this.onFrontPicked,
    required this.onBackPicked,
  });

  final XFile? frontImage;
  final XFile? backImage;
  final ValueChanged<XFile> onFrontPicked;
  final ValueChanged<XFile> onBackPicked;

  @override
  State<RegisterIdUploadStep> createState() => _RegisterIdUploadStepState();
}

class _RegisterIdUploadStepState extends State<RegisterIdUploadStep> {
  final _picker = ImagePicker();
  final _flippableKey = GlobalKey<FlippableIdCardState>();
  IdCardSide? _pickingSide;
  bool _showingBack = false;

  bool get _frontUploaded => widget.frontImage != null;
  bool get _backUploaded => widget.backImage != null;
  bool get _bothUploaded => _frontUploaded && _backUploaded;
  bool get _canFlip => _frontUploaded;

  IdCardSide get _activeSide => _showingBack ? IdCardSide.back : IdCardSide.front;

  void _flipCard() => _flippableKey.currentState?.flip();

  Future<void> _pick(ImageSource source) async {
    if (_pickingSide != null) return;

    final side = _activeSide;
    if (side == IdCardSide.back && !_frontUploaded) {
      _showMessage('Upload the front of your ID first.');
      return;
    }

    final permission = source == ImageSource.camera
        ? await MediaPermissions.ensureCamera()
        : await MediaPermissions.ensureGallery();

    if (!permission.isGranted) {
      if (!mounted) return;
      _showMessage(
        permission.message ?? 'Permission denied.',
        action: permission.openSettings
            ? SnackBarAction(label: 'Settings', onPressed: openAppSettings)
            : null,
      );
      return;
    }

    setState(() => _pickingSide = side);

    try {
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 2400,
      );

      if (!mounted || file == null) return;

      if (side == IdCardSide.front) {
        widget.onFrontPicked(file);
      } else {
        widget.onBackPicked(file);
      }
    } catch (e) {
      if (mounted) {
        _showMessage(
          'Could not open ${source == ImageSource.camera ? 'camera' : 'gallery'}. '
          'Try again or enable permissions in Settings.',
        );
      }
    } finally {
      if (mounted) setState(() => _pickingSide = null);
    }
  }

  void _showMessage(String text, {SnackBarAction? action}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        behavior: SnackBarBehavior.floating,
        action: action,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  void _showIdPreviewModal() {
    if (!_frontUploaded) return;

    showDialog<void>(
      context: context,
      builder: (dialogContext) => _IdPreviewDialog(
        frontImage: widget.frontImage!,
        backImage: widget.backImage,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final uploadedCount = (_frontUploaded ? 1 : 0) + (_backUploaded ? 1 : 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Upload your school ID',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          _frontUploaded && !_showingBack
              ? 'Front uploaded — flip the card to add the back.'
              : 'Upload the front first, then flip to upload the back.',
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _UploadProgressChip(uploaded: uploadedCount, total: 2),
            const Spacer(),
            if (_frontUploaded)
              TextButton.icon(
                onPressed: _showIdPreviewModal,
                icon: const Icon(Icons.visibility_outlined, size: 20),
                label: Text(_backUploaded ? 'View ID' : 'Preview front'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                ),
              ),
          ],
        ),
        const SizedBox(height: 16),
        FlippableIdCard(
          key: _flippableKey,
          frontImage: widget.frontImage,
          backImage: widget.backImage,
          canFlip: _canFlip,
          isLoading: _pickingSide != null,
          loadingSide: _pickingSide,
          onShowingBackChanged: (isBack) {
            if (mounted) setState(() => _showingBack = isBack);
          },
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            _showingBack ? 'Back of ID' : 'Front of ID',
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: AppColors.primaryDark,
            ),
          ),
        ),
        if (_canFlip) ...[
          const SizedBox(height: 8),
          Center(
            child: TextButton.icon(
              onPressed: _flipCard,
              icon: Icon(_showingBack ? Icons.flip_to_front : Icons.flip_to_back),
              label: Text(_showingBack ? 'Show front side' : 'Flip to back side'),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            ),
          ),
        ],
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickingSide != null ? null : () => _pick(ImageSource.camera),
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text('Camera'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.fieldBorder),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickingSide != null ? null : () => _pick(ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Gallery'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.fieldBorder),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
        if (_bothUploaded) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.secondary.withValues(alpha: 0.35)),
            ),
            child: const Row(
              children: [
                Icon(Icons.verified_outlined, color: AppColors.primary, size: 22),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Front and back uploaded. Tap View ID to review, then continue.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _UploadProgressChip extends StatelessWidget {
  const _UploadProgressChip({required this.uploaded, required this.total});

  final int uploaded;
  final int total;

  @override
  Widget build(BuildContext context) {
    final complete = uploaded == total;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: complete
            ? AppColors.secondary.withValues(alpha: 0.15)
            : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: complete ? AppColors.secondary : AppColors.fieldBorder,
        ),
      ),
      child: Text(
        '$uploaded / $total sides uploaded',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: complete ? AppColors.primary : AppColors.secondary,
        ),
      ),
    );
  }
}

class FlippableIdCard extends StatefulWidget {
  const FlippableIdCard({
    super.key,
    required this.frontImage,
    required this.backImage,
    required this.canFlip,
    required this.isLoading,
    required this.loadingSide,
    this.onShowingBackChanged,
  });

  final XFile? frontImage;
  final XFile? backImage;
  final bool canFlip;
  final bool isLoading;
  final IdCardSide? loadingSide;
  final ValueChanged<bool>? onShowingBackChanged;

  @override
  State<FlippableIdCard> createState() => FlippableIdCardState();
}

class FlippableIdCardState extends State<FlippableIdCard>
    with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  Animation<double>? _animation;
  bool _showingBack = false;

  @override
  void initState() {
    super.initState();
    _setupAnimation();
  }

  void _setupAnimation() {
    _controller?.dispose();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    _animation = CurvedAnimation(
      parent: _controller!,
      curve: Curves.easeInOutCubic,
    );
    _controller!.addStatusListener(_onFlipStatus);
  }

  void _onFlipStatus(AnimationStatus status) {
    if (!mounted) return;
    if (status == AnimationStatus.completed) {
      setState(() => _showingBack = true);
      widget.onShowingBackChanged?.call(true);
    } else if (status == AnimationStatus.dismissed) {
      setState(() => _showingBack = false);
      widget.onShowingBackChanged?.call(false);
    }
  }

  @override
  void dispose() {
    _controller?.removeStatusListener(_onFlipStatus);
    _controller?.dispose();
    super.dispose();
  }

  void flip() {
    final controller = _controller;
    if (!widget.canFlip || controller == null || controller.isAnimating) {
      return;
    }
    if (_showingBack) {
      controller.reverse();
    } else {
      controller.forward();
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final animation = _animation;
    if (controller == null || animation == null) {
      return const AspectRatio(
        aspectRatio: 1.58,
        child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    return AspectRatio(
      aspectRatio: 1.58,
      child: AnimatedBuilder(
        animation: animation,
        builder: (context, _) {
          final angle = controller.value * math.pi;
          final showBackFace = angle >= math.pi / 2;

          return GestureDetector(
            onTap: widget.canFlip ? flip : null,
            child: Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001)
                ..rotateY(angle),
              child: showBackFace
                  ? Transform(
                      alignment: Alignment.center,
                      transform: Matrix4.identity()..rotateY(math.pi),
                      child: _CardFace(
                        side: IdCardSide.back,
                        image: widget.backImage,
                        isLoading:
                            widget.isLoading && widget.loadingSide == IdCardSide.back,
                        canFlipHint: widget.canFlip,
                      ),
                    )
                  : _CardFace(
                      side: IdCardSide.front,
                      image: widget.frontImage,
                      isLoading:
                          widget.isLoading && widget.loadingSide == IdCardSide.front,
                      canFlipHint: widget.canFlip && widget.frontImage != null,
                    ),
            ),
          );
        },
      ),
    );
  }
}

class _CardFace extends StatelessWidget {
  const _CardFace({
    required this.side,
    required this.image,
    required this.isLoading,
    required this.canFlipHint,
  });

  final IdCardSide side;
  final XFile? image;
  final bool isLoading;
  final bool canFlipHint;

  @override
  Widget build(BuildContext context) {
    final isFront = side == IdCardSide.front;
    final hasImage = image != null;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: hasImage ? AppColors.secondary : AppColors.fieldBorder,
          width: hasImage ? 2 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: AppColors.background.withValues(alpha: 0.5)),
            if (isLoading)
              const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            else if (hasImage)
              Image.file(File(image!.path), fit: BoxFit.cover)
            else
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isFront ? Icons.badge_outlined : Icons.credit_card_outlined,
                    size: 52,
                    color: AppColors.light,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isFront ? 'Upload front of ID' : 'Upload back of ID',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary.withValues(alpha: 0.85),
                    ),
                  ),
                  if (canFlipHint && isFront) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Tap card to flip after upload',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.light.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ],
              ),
            Positioned(
              top: 10,
              left: 10,
              child: _SideBadge(label: isFront ? 'FRONT' : 'BACK'),
            ),
            if (hasImage)
              const Positioned(
                top: 10,
                right: 10,
                child: Icon(Icons.check_circle, color: AppColors.secondary, size: 24),
              ),
            if (canFlipHint && hasImage && isFront)
              Positioned(
                bottom: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.flip, color: Colors.white, size: 16),
                      SizedBox(width: 4),
                      Text(
                        'Flip',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SideBadge extends StatelessWidget {
  const _SideBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _IdPreviewDialog extends StatelessWidget {
  const _IdPreviewDialog({
    required this.frontImage,
    this.backImage,
  });

  final XFile frontImage;
  final XFile? backImage;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.background,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Uploaded ID',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  color: AppColors.primary,
                ),
              ],
            ),
            const SizedBox(height: 8),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _PreviewPanel(
                      label: 'Front',
                      image: frontImage,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _PreviewPanel(
                      label: 'Back',
                      image: backImage,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PreviewPanel extends StatelessWidget {
  const _PreviewPanel({
    required this.label,
    this.image,
  });

  final String label;
  final XFile? image;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 13,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 8),
        AspectRatio(
          aspectRatio: 1.58,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: image != null ? AppColors.secondary : AppColors.fieldBorder,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: image != null
                  ? Image.file(File(image!.path), fit: BoxFit.cover)
                  : ColoredBox(
                      color: AppColors.background,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.image_not_supported_outlined,
                            color: AppColors.light.withValues(alpha: 0.9),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Not uploaded',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.secondary.withValues(alpha: 0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}
