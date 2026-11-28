import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/session_restore_service.dart';

/// Started by the splash, which routes on the result.
final sessionRestoreProvider = FutureProvider<SessionRestoreResult>((ref) {
  return SessionRestoreService().restore();
});
