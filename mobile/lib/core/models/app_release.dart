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

  /// Tag without its `v` / `mobile-v` prefix, e.g. `1.2.0`.
  final String version;
  final String tag;

  /// Plain text; markdown and `[required]` stripped.
  final String notes;

  final String apkUrl;
  final String apkName;
  final int? apkBytes;

  /// GitHub's hex digest, used to verify the download.
  final String? sha256;

  /// `[required]` in the notes hides "Later".
  final bool isRequired;

  static const String requiredMarker = '[required]';

  /// Longest first.
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

  /// Ignores `-pre` / `+build` suffixes; positive when [a] is newer.
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

  static String stripRequiredMarker(String markdown) => markdown
      .replaceAll('\r', '')
      .replaceAll(
        RegExp(RegExp.escape(requiredMarker), caseSensitive: false),
        '',
      )
      .trim();

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

/// Unlike [AppRelease], needs no APK: older releases keep readable notes.
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

  /// Null unless the GitHub release name says more than the tag.
  final String? title;

  /// Markdown with `[required]` removed; empty when none.
  final String markdown;

  final bool isRequired;
  final DateTime? publishedAt;

  final String? pageUrl;

  /// Null when no APK is attached.
  final AppRelease? installable;
}
