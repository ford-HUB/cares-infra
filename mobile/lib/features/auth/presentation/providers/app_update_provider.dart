import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/app_release.dart';
import 'package:mobile/core/services/app_update_service.dart';

final appUpdateServiceProvider = Provider<AppUpdateService>(
  (ref) => AppUpdateService(),
);

/// The installed version, e.g. `1.2.0`, for the version badge.
final installedVersionProvider = FutureProvider<String>(
  (ref) => AppUpdateService.installedVersion(),
);

/// GitHub releases for the release-notes sheet; fetched each time it opens.
final releaseHistoryProvider =
    FutureProvider.autoDispose<List<AppReleaseEntry>>(
      (ref) => ref.read(appUpdateServiceProvider).fetchReleaseHistory(),
    );

final appUpdateProvider = NotifierProvider<AppUpdateNotifier, AppUpdateState>(
  AppUpdateNotifier.new,
);

enum AppUpdatePhase {
  /// Nothing asked yet.
  idle,
  checking,

  /// Up to date, unsupported build, or the check failed — carry on.
  none,
  available,
  downloading,

  /// The Android installer has been opened.
  installing,
  failed,

  /// "Later" on an optional update.
  dismissed,
}

class AppUpdateState {
  const AppUpdateState({
    this.phase = AppUpdatePhase.idle,
    this.release,
    this.progress,
    this.error,
  });

  final AppUpdatePhase phase;
  final AppRelease? release;

  /// 0–1 while downloading; null when not yet known.
  final double? progress;
  final String? error;

  /// The splash stays up while this is true.
  bool get holdsSplash => switch (phase) {
    AppUpdatePhase.idle ||
    AppUpdatePhase.none ||
    AppUpdatePhase.dismissed => false,
    _ => true,
  };

  /// The update card is shown on the splash.
  bool get showsPanel => holdsSplash && phase != AppUpdatePhase.checking;

  AppUpdateState copyWith({
    AppUpdatePhase? phase,
    double? progress,
    String? error,
  }) => AppUpdateState(
    phase: phase ?? this.phase,
    release: release,
    progress: progress,
    error: error,
  );
}

class AppUpdateNotifier extends Notifier<AppUpdateState> {
  StreamSubscription<AppUpdateProgress>? _install;

  @override
  AppUpdateState build() {
    ref.onDispose(() => _install?.cancel());
    return const AppUpdateState();
  }

  /// Runs once per launch, alongside the splash animation.
  Future<void> check() async {
    if (state.phase != AppUpdatePhase.idle) return;
    state = const AppUpdateState(phase: AppUpdatePhase.checking);
    final release = await ref.read(appUpdateServiceProvider).checkForUpdate();
    state = release == null
        ? const AppUpdateState(phase: AppUpdatePhase.none)
        : AppUpdateState(phase: AppUpdatePhase.available, release: release);
  }

  /// Download the APK and open the installer. Also the retry action.
  void startUpdate() {
    final release = state.release;
    if (release == null || state.phase == AppUpdatePhase.downloading) return;

    _install?.cancel();
    state = state.copyWith(phase: AppUpdatePhase.downloading);
    _install = ref.read(appUpdateServiceProvider).install(release).listen((
      step,
    ) {
      state = switch (step.kind) {
        AppUpdateProgressKind.downloading => state.copyWith(
          phase: AppUpdatePhase.downloading,
          progress: step.fraction,
        ),
        AppUpdateProgressKind.installing => state.copyWith(
          phase: AppUpdatePhase.installing,
          progress: 1,
        ),
        AppUpdateProgressKind.failed => state.copyWith(
          phase: AppUpdatePhase.failed,
          error: step.error,
        ),
      };
    });
  }

  /// Install [release] picked from the release-notes sheet — also after
  /// "Later" was tapped on the splash.
  void startUpdateTo(AppRelease release) {
    if (state.phase == AppUpdatePhase.downloading) return;
    state = AppUpdateState(phase: AppUpdatePhase.available, release: release);
    startUpdate();
  }

  /// "Later" — only offered when the release is not marked required.
  void dismiss() {
    if (state.release?.isRequired ?? false) return;
    _install?.cancel();
    state = state.copyWith(phase: AppUpdatePhase.dismissed);
  }
}
