/// A published GitHub Release that carries an installable APK.
class AppRelease {
  const AppRelease({
    required this.version,
    required this.tag,
    required this.notes,
    required this.apkUrl,
    required this.apkName,
    required this.isRequired,
    this.apkBytes,
    this.sha256,
  });

  /// `1.2.0` — the tag without its `v` / `mobile-v` prefix.
  final String version;
  final String tag;

  /// Release notes as plain text, markdown markers and `[required]` removed.
  final String notes;

  final String apkUrl;
  final String apkName;
  final int? apkBytes;

  /// Hex digest GitHub reports for the asset, used to verify the download.
  final String? sha256;

  /// `[required]` in the notes hides "Later": the app cannot be used until
  /// it is updated.
  final bool isRequired;

  static const String requiredMarker = '[required]';

  /// Tag prefixes the release workflow accepts, longest first.
  static const List<String> _tagPrefixes = ['mobile-v', 'v'];

  /// Null when [tag] is not a `major.minor.patch` version.
  static String? versionFromTag(String tag) {
    var value = tag.trim();
    for (final prefix in _tagPrefixes) {
      if (value.startsWith(prefix)) {
        value = value.substring(prefix.length);
        break;
      }
    }
    return RegExp(r'^\d+\.\d+\.\d+$').hasMatch(value) ? value : null;
  }

  /// Compares `major.minor.patch` versions; any `-pre` / `+build` suffix is
  /// ignored. Positive when [a] is newer than [b].
  static int compareVersions(String a, String b) {
    List<int> parts(String v) => v
        .split(RegExp(r'[-+]'))
        .first
        .split('.')
        .map((p) => int.tryParse(p) ?? 0)
        .toList();

    final pa = parts(a);
    final pb = parts(b);
    for (var i = 0; i < 3; i++) {
      final x = i < pa.length ? pa[i] : 0;
      final y = i < pb.length ? pb[i] : 0;
      if (x != y) return x.compareTo(y);
    }
    return 0;
  }

  /// The release body with `[required]` taken out — it steers the updater
  /// and is not meant to be read.
  static String stripRequiredMarker(String markdown) => markdown
      .replaceAll('\r', '')
      .replaceAll(
        RegExp(RegExp.escape(requiredMarker), caseSensitive: false),
        '',
      )
      .trim();

  /// Release notes markdown flattened for a small card.
  static String plainNotes(String markdown) {
    return stripRequiredMarker(markdown)
        .split('\n')
        .map((line) {
          var l = line.trim();
          l = l.replaceFirst(RegExp(r'^#{1,6}\s*'), '');
          l = l.replaceFirst(RegExp(r'^[-*+]\s+'), '• ');
          l = l.replaceAll(RegExp(r'\*\*|__|`'), '');
          // [label](url) → label
          l = l.replaceAllMapped(
            RegExp(r'\[([^\]]+)\]\([^)]*\)'),
            (m) => m.group(1)!,
          );
          return l;
        })
        .where((l) => l.isNotEmpty)
        .join('\n');
  }
}

/// One published release as listed in the release-notes sheet. Unlike
/// [AppRelease] it does not need an APK: an older release whose asset was
/// removed still has notes worth reading.
class AppReleaseEntry {
  const AppReleaseEntry({
    required this.version,
    required this.tag,
    required this.title,
    required this.markdown,
    required this.isRequired,
    this.publishedAt,
    this.pageUrl,
    this.installable,
  });

  final String version;
  final String tag;

  /// The release name on GitHub when it says more than the tag; else null.
  final String? title;

  /// The release notes as written on GitHub (markdown), `[required]`
  /// removed; empty when none.
  final String markdown;

  /// Marked `[required]` in its notes.
  final bool isRequired;
  final DateTime? publishedAt;

  /// The release page on GitHub.
  final String? pageUrl;

  /// Set when the release has its APK attached and can be installed.
  final AppRelease? installable;
}
