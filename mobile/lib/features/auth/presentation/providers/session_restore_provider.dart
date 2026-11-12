import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/session_restore_service.dart';

/// The launch-time attempt to bring back the last signed-in session. Started
/// by the splash, which plays while it runs and then routes on the result.
final sessionRestoreProvider = FutureProvider<SessionRestoreResult>((ref) {
  return SessionRestoreService().restore();
});
