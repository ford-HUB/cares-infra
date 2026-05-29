import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:mobile/features/auth/presentation/utils/face_camera_input_helper.dart';
import 'package:mobile/features/auth/presentation/utils/face_guide_geometry.dart';

enum FaceLivenessPhase {
  center,
  blink,
  turnLeft,
  turnRight,
  finalCapture,
  finished,
}

extension FaceLivenessPhaseCapture on FaceLivenessPhase {
  /// Blink step stays automatic only.
  bool get allowsManualCapture => switch (this) {
        FaceLivenessPhase.center => true,
        FaceLivenessPhase.blink => false,
        FaceLivenessPhase.turnLeft => true,
        FaceLivenessPhase.turnRight => true,
        FaceLivenessPhase.finalCapture => true,
        FaceLivenessPhase.finished => false,
      };
}

class FaceLivenessChecker {
  FaceLivenessPhase phase = FaceLivenessPhase.center;

  FaceLivenessPhase? _phaseJustCompleted;
  int _streak = 0;
  bool _eyesOpenSeen = false;
  bool _eyesClosedSeen = false;
  double? _baselineYaw;
  DateTime _phaseStarted = DateTime.now();

  /// Safety net only — does not auto-skip real liveness under normal use.
  static const phaseTimeout = Duration(seconds: 45);
  static const minPhaseDuration = Duration(milliseconds: 1800);

  static const _centerStreak = 14;
  static const _blinkStreak = 4;
  static const _turnStreak = 10;
  static const _finalStreak = 12;
  static const _turnDegrees = 12.0;

  String get instruction => switch (phase) {
        FaceLivenessPhase.center =>
          'Center your face in the oval until the outline turns green',
        FaceLivenessPhase.blink => 'Keep centered, then blink both eyes once',
        FaceLivenessPhase.turnLeft =>
          'Slowly turn your head to your left and hold',
        FaceLivenessPhase.turnRight =>
          'Slowly turn your head to your right and hold',
        FaceLivenessPhase.finalCapture =>
          'Face forward in the oval for your final photo',
        FaceLivenessPhase.finished => 'All face photos captured',
      };

  int get activeStepIndex => switch (phase) {
        FaceLivenessPhase.center => 0,
        FaceLivenessPhase.blink => 1,
        FaceLivenessPhase.turnLeft => 2,
        FaceLivenessPhase.turnRight => 3,
        FaceLivenessPhase.finalCapture => 4,
        FaceLivenessPhase.finished => 4,
      };

  bool get isFinished => phase == FaceLivenessPhase.finished;

  /// 0–1 progress while holding the current step pose before auto-capture.
  double get holdProgress {
    if (phase == FaceLivenessPhase.finished) return 0;
    final required = _requiredStreakFor(phase);
    if (required <= 0) return 0;
    return (_streak / required).clamp(0.0, 1.0);
  }

  int _requiredStreakFor(FaceLivenessPhase p) => switch (p) {
        FaceLivenessPhase.center => _centerStreak,
        FaceLivenessPhase.blink => _blinkStreak,
        FaceLivenessPhase.turnLeft => _turnStreak,
        FaceLivenessPhase.turnRight => _turnStreak,
        FaceLivenessPhase.finalCapture => _finalStreak,
        FaceLivenessPhase.finished => 1,
      };

  FaceLivenessPhase? consumeCompletedPhase() {
    final p = _phaseJustCompleted;
    _phaseJustCompleted = null;
    return p;
  }

  /// Resets hold progress when the face leaves frame — no auto-capture.
  void tickWithoutFace() {
    if (phase == FaceLivenessPhase.finished) return;
    _streak = 0;
    if (phase == FaceLivenessPhase.blink) {
      _eyesOpenSeen = false;
      _eyesClosedSeen = false;
    }
  }

  bool update(Face face, CameraFrameInput frame) {
    if (phase == FaceLivenessPhase.finished) return false;

    if (_phaseTimedOut()) {
      _completeCurrentPhase();
      return _phaseJustCompleted != null;
    }

    if (!_minPhaseElapsed) return false;

    switch (phase) {
      case FaceLivenessPhase.center:
        if (FaceGuideGeometry.isFaceCenteredInOval(face, frame)) {
          _bumpStreak(_centerStreak);
        } else {
          _resetStreak();
        }
      case FaceLivenessPhase.blink:
        if (!FaceGuideGeometry.isFaceDetectable(face, frame)) {
          _resetStreak();
          break;
        }
        if (_blinkDetected(face)) {
          _bumpStreak(_blinkStreak);
        } else {
          _resetStreak();
        }
      case FaceLivenessPhase.turnLeft:
        if (_turnedLeft(face)) {
          _bumpStreak(_turnStreak);
        } else {
          _resetStreak();
        }
      case FaceLivenessPhase.turnRight:
        if (_turnedRight(face)) {
          _bumpStreak(_turnStreak);
        } else {
          _resetStreak();
        }
      case FaceLivenessPhase.finalCapture:
        if (FaceGuideGeometry.isFaceCenteredInOval(face, frame)) {
          _bumpStreak(_finalStreak);
        } else {
          _resetStreak();
        }
      case FaceLivenessPhase.finished:
        break;
    }

    return _phaseJustCompleted != null;
  }

  void reset() {
    phase = FaceLivenessPhase.center;
    _phaseJustCompleted = null;
    _resetPhaseState();
  }

  void forceCompleteCurrentPhase() {
    if (phase == FaceLivenessPhase.finished) return;
    _completeCurrentPhase();
  }

  void _completeCurrentPhase() {
    _phaseJustCompleted = phase;
    _resetPhaseState();

    phase = switch (phase) {
      FaceLivenessPhase.center => FaceLivenessPhase.blink,
      FaceLivenessPhase.blink => FaceLivenessPhase.turnLeft,
      FaceLivenessPhase.turnLeft => FaceLivenessPhase.turnRight,
      FaceLivenessPhase.turnRight => FaceLivenessPhase.finalCapture,
      FaceLivenessPhase.finalCapture => FaceLivenessPhase.finished,
      FaceLivenessPhase.finished => FaceLivenessPhase.finished,
    };
  }

  void _resetPhaseState() {
    _streak = 0;
    _eyesOpenSeen = false;
    _eyesClosedSeen = false;
    _baselineYaw = null;
    _phaseStarted = DateTime.now();
  }

  void _bumpStreak(int required) {
    if (++_streak >= required) _completeCurrentPhase();
  }

  void _resetStreak() => _streak = 0;

  bool get _minPhaseElapsed =>
      DateTime.now().difference(_phaseStarted) >= minPhaseDuration;

  bool _phaseTimedOut() =>
      DateTime.now().difference(_phaseStarted) >= phaseTimeout;

  bool _blinkDetected(Face face) {
    final left = face.leftEyeOpenProbability;
    final right = face.rightEyeOpenProbability;
    if (left == null || right == null) return false;

    if (left > 0.55 && right > 0.55) _eyesOpenSeen = true;
    if (_eyesOpenSeen && left < 0.32 && right < 0.32) _eyesClosedSeen = true;

    return _eyesOpenSeen && _eyesClosedSeen;
  }

  bool _turnedLeft(Face face) {
    final y = face.headEulerAngleY;
    if (y == null) return false;
    _baselineYaw ??= y;
    return y < _baselineYaw! - _turnDegrees;
  }

  bool _turnedRight(Face face) {
    final y = face.headEulerAngleY;
    if (y == null) return false;
    _baselineYaw ??= y;
    return y > _baselineYaw! + _turnDegrees;
  }
}
