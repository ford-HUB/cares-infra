import 'package:image_picker/image_picker.dart';

/// Five face shots: center, blink, left, right, and final.
class FaceCaptureSet {
  const FaceCaptureSet({
    this.center,
    this.blink,
    this.left,
    this.right,
    this.finalShot,
  });

  final XFile? center;
  final XFile? blink;
  final XFile? left;
  final XFile? right;
  final XFile? finalShot;

  bool get isComplete =>
      center != null &&
      blink != null &&
      left != null &&
      right != null &&
      finalShot != null;

  static const labels = ['Center', 'Blink', 'Left', 'Right', 'Final'];

  List<XFile?> get shots => [center, blink, left, right, finalShot];

  FaceCaptureSet copyWith({
    XFile? center,
    XFile? blink,
    XFile? left,
    XFile? right,
    XFile? finalShot,
  }) {
    return FaceCaptureSet(
      center: center ?? this.center,
      blink: blink ?? this.blink,
      left: left ?? this.left,
      right: right ?? this.right,
      finalShot: finalShot ?? this.finalShot,
    );
  }
}
