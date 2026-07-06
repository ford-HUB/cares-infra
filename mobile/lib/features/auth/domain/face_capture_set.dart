import 'package:image_picker/image_picker.dart';

/// Single face photo captured during registration.
class FaceCaptureSet {
  const FaceCaptureSet({this.photo});

  final XFile? photo;

  bool get isComplete => photo != null;

  FaceCaptureSet copyWith({XFile? photo}) {
    return FaceCaptureSet(photo: photo ?? this.photo);
  }
}
