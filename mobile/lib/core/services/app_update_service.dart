import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/models/app_release.dart';
import 'package:ota_update/ota_update.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// One step of downloading and handing an update to the Android installer.
class AppUpdateProgress {
  const AppUpdateProgress._(this.kind, {this.fraction, this.error});

  const AppUpdateProgress.downloading(double? fraction)
    : this._(AppUpdateProgressKind.downloading, fraction: fraction);
  const AppUpdateProgress.installing()
    : this._(AppUpdateProgressKind.installing);
  const AppUpdateProgress.failed(String error)
    : this._(AppUpdateProgressKind.failed, error: error);

  final AppUpdateProgressKind kind;

  /// 0–1 while downloading; null when the size is not known yet.
  final double? fraction;
  final String? error;
}

enum AppUpdateProgressKind { downloading, installing, failed }

/// Checks GitHub Releases for a newer APK and installs it.
///
/// The release workflow (`.github/workflows/mobile-release.yml`) attaches
/// `cares-<version>.apk` to each release published on GitHub; this reads the
/// release marked "Latest" (drafts and pre-releases are skipped by GitHub) and
/// offers it when its version is above the installed one.
class AppUpdateService {
  AppUpdateService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String _githubApi = 'https://api.github.com';

  /// The splash waits on this, so a slow or absent network must not hold it.
  static const Duration _checkTimeout = Duration(seconds: 4);

  /// The release-notes sheet shows a spinner meanwhile, so it can wait longer.
  static const Duration _historyTimeout = Duration(seconds: 10);

  static const Map<String, String> _headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  /// The repository's releases page, or null when unconfigured.
  static String? get releasesPageUrl {
    final repo = releasesRepo;
    return repo == null ? null : 'https://github.com/$repo/releases';
  }

  /// The version this build was installed as, e.g. `1.2.0`.
  static Future<String> installedVersion() async =>
      (await PackageInfo.fromPlatform()).version;

  /// `owner/repo` the release workflow publishes to. CI fills it in; unset
  /// disables update checks.
  static String? get releasesRepo {
    final value = dotenv.env['UPDATE_RELEASES_REPO']?.trim();
    return value == null || value.isEmpty ? null : value;
  }

  /// Only signed Android release builds update themselves: a debug build has
  /// a different signature and Android would refuse to install over it.
  static bool get isSupported =>
      !kIsWeb && Platform.isAndroid && kReleaseMode && releasesRepo != null;

  /// The newer release with an APK attached, or null when up to date,
  /// unsupported, offline, or anything else goes wrong — a failed check
  /// never blocks the app.
  Future<AppRelease?> checkForUpdate() async {
    if (!isSupported) return null;
    try {
      final installed = await installedVersion();
      final response = await _client
          .get(
            Uri.parse('$_githubApi/repos/$releasesRepo/releases/latest'),
            headers: _headers,
          )
          .timeout(_checkTimeout);
      if (response.statusCode != 200) return null;

      final release = _parseRelease(
        jsonDecode(response.body) as Map<String, dynamic>,
      );
      if (release == null) return null;
      return AppRelease.compareVersions(release.version, installed) > 0
          ? release
          : null;
    } catch (error) {
      debugPrint('Update check skipped: $error');
      return null;
    }
  }

  /// Published releases with a version tag, newest first, for the
  /// release-notes sheet. Drafts and pre-releases are left out, as they are
  /// for updates. Unlike [checkForUpdate] this works in any build, and it
  /// throws when the list cannot be loaded so the sheet can say so.
  Future<List<AppReleaseEntry>> fetchReleaseHistory() async {
    final repo = releasesRepo;
    if (repo == null) return const [];

    final response = await _client
        .get(
          Uri.parse('$_githubApi/repos/$repo/releases?per_page=30'),
          headers: _headers,
        )
        .timeout(_historyTimeout);
    if (response.statusCode != 200) {
      throw http.ClientException(
        'GitHub releases returned ${response.statusCode}',
      );
    }

    final entries = <AppReleaseEntry>[];
    for (final json
        in (jsonDecode(response.body) as List<dynamic>)
            .whereType<Map<String, dynamic>>()) {
      if (json['draft'] == true || json['prerelease'] == true) continue;
      final tag = json['tag_name'] as String? ?? '';
      final version = AppRelease.versionFromTag(tag);
      if (version == null) continue;

      final name = (json['name'] as String? ?? '').trim();
      final body = json['body'] as String? ?? '';
      final published = json['published_at'] as String?;
      entries.add(
        AppReleaseEntry(
          version: version,
          tag: tag,
          title: name.isEmpty || name == tag || name == version ? null : name,
          markdown: AppRelease.stripRequiredMarker(body),
          isRequired: body.toLowerCase().contains(AppRelease.requiredMarker),
          publishedAt: published == null
              ? null
              : DateTime.tryParse(published)?.toLocal(),
          pageUrl: json['html_url'] as String?,
          installable: _parseRelease(json),
        ),
      );
    }
    entries.sort((a, b) => AppRelease.compareVersions(b.version, a.version));
    return entries;
  }

  AppRelease? _parseRelease(Map<String, dynamic> json) {
    final tag = json['tag_name'] as String? ?? '';
    final version = AppRelease.versionFromTag(tag);
    if (version == null) return null;

    // Published but the workflow has not attached the APK yet.
    final assets = (json['assets'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>();
    final apk = assets
        .where(
          (a) => (a['name'] as String? ?? '').toLowerCase().endsWith('.apk'),
        )
        .firstOrNull;
    final url = apk?['browser_download_url'] as String?;
    if (apk == null || url == null) return null;

    final body = json['body'] as String? ?? '';
    final digest = apk['digest'] as String?;

    return AppRelease(
      version: version,
      tag: tag,
      notes: AppRelease.plainNotes(body),
      apkUrl: url,
      apkName: apk['name'] as String,
      apkBytes: (apk['size'] as num?)?.toInt(),
      sha256: digest != null && digest.startsWith('sha256:')
          ? digest.substring('sha256:'.length)
          : null,
      isRequired: body.toLowerCase().contains(AppRelease.requiredMarker),
    );
  }

  /// Downloads the APK into app storage and opens the system installer.
  Stream<AppUpdateProgress> install(AppRelease release) {
    late final StreamController<AppUpdateProgress> controller;
    StreamSubscription<OtaEvent>? subscription;

    controller = StreamController<AppUpdateProgress>(
      onListen: () {
        controller.add(const AppUpdateProgress.downloading(null));
        try {
          subscription = OtaUpdate()
              .execute(
                release.apkUrl,
                destinationFilename: release.apkName,
                sha256checksum: release.sha256,
              )
              .listen(
                (event) {
                  final progress = _map(event);
                  if (progress != null) controller.add(progress);
                },
                onError: (Object error) {
                  debugPrint('Update download failed: $error');
                  controller
                    ..add(
                      const AppUpdateProgress.failed(
                        AppCopy.updateDownloadFailed,
                      ),
                    )
                    ..close();
                },
                onDone: controller.close,
              );
        } catch (error) {
          debugPrint('Update download failed: $error');
          controller
            ..add(const AppUpdateProgress.failed(AppCopy.updateDownloadFailed))
            ..close();
        }
      },
      onCancel: () => subscription?.cancel(),
    );
    return controller.stream;
  }

  AppUpdateProgress? _map(OtaEvent event) {
    switch (event.status) {
      case OtaStatus.DOWNLOADING:
        final percent = double.tryParse(event.value ?? '');
        return AppUpdateProgress.downloading(
          percent == null ? null : (percent / 100).clamp(0.0, 1.0),
        );
      case OtaStatus.INSTALLING:
      case OtaStatus.INSTALLATION_DONE:
        return const AppUpdateProgress.installing();
      case OtaStatus.ALREADY_RUNNING_ERROR:
        return null;
      case OtaStatus.PERMISSION_NOT_GRANTED_ERROR:
        return const AppUpdateProgress.failed(AppCopy.updateInstallBlocked);
      case OtaStatus.CHECKSUM_ERROR:
        return const AppUpdateProgress.failed(AppCopy.updateChecksumFailed);
      default:
        return const AppUpdateProgress.failed(AppCopy.updateDownloadFailed);
    }
  }
}
