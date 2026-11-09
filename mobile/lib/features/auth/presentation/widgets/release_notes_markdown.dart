import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Renders the markdown GitHub release notes are written in: headings,
/// paragraphs, bullet / numbered / task lists (nested), quotes, code blocks,
/// rules, and inline bold, italic, strikethrough, code, links, bare URLs and
/// @mentions. GitHub pull / issue / compare URLs are shortened the way GitHub
/// shows them (`#12`, `v1.0.0...v1.0.1`).
class ReleaseNotesMarkdown extends StatefulWidget {
  const ReleaseNotesMarkdown({
    super.key,
    required this.markdown,
    required this.onOpenLink,
  });

  final String markdown;
  final ValueChanged<String> onOpenLink;

  @override
  State<ReleaseNotesMarkdown> createState() => _ReleaseNotesMarkdownState();
}

class _ReleaseNotesMarkdownState extends State<ReleaseNotesMarkdown> {
  late List<_Block> _blocks;
  final List<TapGestureRecognizer> _recognizers = [];

  @override
  void initState() {
    super.initState();
    _blocks = _parseBlocks(widget.markdown);
  }

  @override
  void didUpdateWidget(ReleaseNotesMarkdown old) {
    super.didUpdateWidget(old);
    if (old.markdown != widget.markdown) {
      _blocks = _parseBlocks(widget.markdown);
    }
  }

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  void _disposeRecognizers() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  static const TextStyle _body = TextStyle(
    fontSize: 13.5,
    height: 1.55,
    color: AppColors.textSecondary,
  );

  @override
  Widget build(BuildContext context) {
    _disposeRecognizers();
    final children = <Widget>[];
    _Block? previous;
    for (final block in _blocks) {
      if (previous != null) {
        children.add(SizedBox(height: _gapBefore(block, previous)));
      }
      children.add(_buildBlock(block));
      previous = block;
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
  }

  double _gapBefore(_Block block, _Block previous) {
    if (block is _Heading) return 14;
    if (block is _ListItem && previous is _ListItem) return 5;
    if (previous is _Heading) return 6;
    return 9;
  }

  Widget _buildBlock(_Block block) {
    switch (block) {
      case _Heading(:final level, :final text):
        final style = switch (level) {
          1 => const TextStyle(
            fontSize: 17,
            height: 1.3,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
          2 => const TextStyle(
            fontSize: 15.5,
            height: 1.3,
            fontWeight: FontWeight.w900,
            color: AppColors.primaryDark,
          ),
          _ => const TextStyle(
            fontSize: 14,
            height: 1.35,
            fontWeight: FontWeight.w800,
            color: AppColors.ink,
          ),
        };
        return Text.rich(TextSpan(style: style, children: _inline(text)));

      case _Paragraph(:final text):
        return Text.rich(TextSpan(style: _body, children: _inline(text)));

      case _ListItem(:final depth, :final number, :final checked, :final text):
        return Padding(
          padding: EdgeInsets.only(left: 16.0 * depth),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: number != null ? 24 : 20,
                child: _marker(depth: depth, number: number, checked: checked),
              ),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: checked == true
                        ? _body.copyWith(color: AppColors.inkMuted)
                        : _body,
                    children: _inline(text),
                  ),
                ),
              ),
            ],
          ),
        );

      case _Quote(:final text):
        return Container(
          padding: const EdgeInsets.fromLTRB(12, 2, 4, 2),
          decoration: const BoxDecoration(
            border: Border(
              left: BorderSide(color: AppColors.accentLight, width: 3),
            ),
          ),
          child: Text.rich(
            TextSpan(
              style: _body.copyWith(
                color: AppColors.inkMuted,
                fontStyle: FontStyle.italic,
              ),
              children: _inline(text),
            ),
          ),
        );

      case _Code(:final text):
        return Container(
          decoration: BoxDecoration(
            color: AppColors.softFieldFill,
            border: Border.all(color: AppColors.softFieldBorder),
            borderRadius: BorderRadius.circular(10),
          ),
          padding: const EdgeInsets.all(12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Text(
              text,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 12.5,
                height: 1.45,
                color: AppColors.ink,
              ),
            ),
          ),
        );

      case _Rule():
        return const Divider(
          height: 8,
          thickness: 1,
          color: AppColors.cardBorder,
        );
    }
  }

  Widget _marker({required int depth, int? number, bool? checked}) {
    if (checked != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Icon(
          checked
              ? Icons.check_box_rounded
              : Icons.check_box_outline_blank_rounded,
          size: 16,
          color: checked ? AppColors.primary : AppColors.inkMuted,
        ),
      );
    }
    if (number != null) {
      return Text(
        '$number.',
        style: _body.copyWith(
          fontWeight: FontWeight.w800,
          color: AppColors.primaryDark,
        ),
      );
    }
    // Filled dot at the top level, hollow ring when nested.
    return Padding(
      padding: const EdgeInsets.only(top: 8, left: 2),
      child: Align(
        alignment: Alignment.topLeft,
        child: Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: depth == 0 ? AppColors.primary : null,
            border: depth == 0
                ? null
                : Border.all(color: AppColors.primary, width: 1.4),
          ),
        ),
      ),
    );
  }

  // --- Inline ---------------------------------------------------------------

  static final RegExp _inlinePattern = RegExp(
    r'\*\*(.+?)\*\*' // 1 bold
    r'|__(.+?)__' // 2 bold
    r'|~~(.+?)~~' // 3 strikethrough
    r'|`([^`]+)`' // 4 code
    r'|\[([^\]]+)\]\(([^)\s]+)\)' // 5 label, 6 url
    r"|(https?://[^\s<>()]*[^\s<>().,;:!?'"
    '"'
    r"])" // 7 bare url
    r'|(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])' // 8 italic
    r'|(?<![\w_])_(?![\s_])(.+?)(?<![\s_])_(?![\w_])' // 9 italic
    r'|(?<![\w@/])@([A-Za-z0-9][A-Za-z0-9-]{0,38})(?![\w-])', // 10 mention
  );

  List<InlineSpan> _inline(String text, {TextStyle? style}) {
    final spans = <InlineSpan>[];
    var cursor = 0;
    for (final m in _inlinePattern.allMatches(text)) {
      if (m.start > cursor) {
        spans.add(
          TextSpan(text: text.substring(cursor, m.start), style: style),
        );
      }
      final base = style ?? const TextStyle();
      if (m[1] != null || m[2] != null) {
        spans.addAll(
          _inline(
            m[1] ?? m[2]!,
            style: base.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
            ),
          ),
        );
      } else if (m[3] != null) {
        spans.addAll(
          _inline(
            m[3]!,
            style: base.copyWith(decoration: TextDecoration.lineThrough),
          ),
        );
      } else if (m[4] != null) {
        spans.add(
          TextSpan(
            text: m[4],
            style: base.copyWith(
              fontFamily: 'monospace',
              fontSize: 12.5,
              color: AppColors.ink,
              backgroundColor: AppColors.softFieldFill,
            ),
          ),
        );
      } else if (m[5] != null) {
        spans.add(_link(m[5]!, m[6]!, base));
      } else if (m[7] != null) {
        spans.add(_link(_shortLabel(m[7]!), m[7]!, base));
      } else if (m[8] != null || m[9] != null) {
        spans.addAll(
          _inline(
            m[8] ?? m[9]!,
            style: base.copyWith(fontStyle: FontStyle.italic),
          ),
        );
      } else if (m[10] != null) {
        spans.add(
          _link('@${m[10]}', 'https://github.com/${m[10]}', base, bold: true),
        );
      }
      cursor = m.end;
    }
    if (cursor < text.length) {
      spans.add(TextSpan(text: text.substring(cursor), style: style));
    }
    return spans;
  }

  TextSpan _link(
    String label,
    String url,
    TextStyle base, {
    bool bold = false,
  }) {
    final recognizer = TapGestureRecognizer()
      ..onTap = () => widget.onOpenLink(url);
    _recognizers.add(recognizer);
    return TextSpan(
      text: label,
      recognizer: recognizer,
      style: base.copyWith(
        color: AppColors.primary,
        fontWeight: bold ? FontWeight.w800 : FontWeight.w700,
        decoration: bold ? null : TextDecoration.underline,
        decorationColor: AppColors.primary.withValues(alpha: 0.45),
      ),
    );
  }

  static final RegExp _githubRef = RegExp(
    r'^https://github\.com/[^/]+/[^/]+/(?:pull|issues)/(\d+)/?$',
  );
  static final RegExp _githubCompare = RegExp(
    r'^https://github\.com/[^/]+/[^/]+/compare/(.+)$',
  );

  /// How GitHub itself shows a pasted URL.
  static String _shortLabel(String url) {
    final ref = _githubRef.firstMatch(url);
    if (ref != null) return '#${ref[1]}';
    final compare = _githubCompare.firstMatch(url);
    if (compare != null) return compare[1]!;
    return url.replaceFirst(RegExp(r'^https?://(www\.)?'), '');
  }
}

// --- Blocks -----------------------------------------------------------------

sealed class _Block {
  const _Block();
}

class _Heading extends _Block {
  const _Heading(this.level, this.text);
  final int level;
  final String text;
}

class _Paragraph extends _Block {
  const _Paragraph(this.text);
  final String text;
}

class _ListItem extends _Block {
  _ListItem({
    required this.depth,
    required this.text,
    this.number,
    this.checked,
  });
  final int depth;

  /// Set for `1.` items; null for bullets.
  final int? number;

  /// Set for `- [ ]` / `- [x]` task items.
  final bool? checked;
  String text;
}

class _Quote extends _Block {
  _Quote(this.text);
  String text;
}

class _Code extends _Block {
  const _Code(this.text);
  final String text;
}

class _Rule extends _Block {
  const _Rule();
}

final RegExp _headingLine = RegExp(r'^(#{1,6})\s+(.*?)\s*#*$');
final RegExp _ruleLine = RegExp(r'^([-*_])(?:\s*\1){2,}$');
final RegExp _bulletLine = RegExp(r'^(\s*)[-*+]\s+(.*)$');
final RegExp _numberedLine = RegExp(r'^(\s*)(\d+)[.)]\s+(.*)$');
final RegExp _taskPrefix = RegExp(r'^\[([ xX])\]\s+');
final RegExp _quoteLine = RegExp(r'^>\s?(.*)$');

List<_Block> _parseBlocks(String markdown) {
  final lines = markdown
      .replaceAll('\r', '')
      .replaceAll(RegExp(r'<!--[\s\S]*?-->'), '')
      .replaceAll('\t', '    ')
      .split('\n');

  final blocks = <_Block>[];
  final paragraph = <String>[];

  void flush() {
    if (paragraph.isEmpty) return;
    blocks.add(_Paragraph(paragraph.join(' ')));
    paragraph.clear();
  }

  int depthOf(String indent) => (indent.length ~/ 2).clamp(0, 3);

  for (var i = 0; i < lines.length; i++) {
    final line = lines[i].trimRight();
    final trimmed = line.trimLeft();

    if (trimmed.startsWith('```')) {
      flush();
      final code = <String>[];
      while (++i < lines.length && !lines[i].trimLeft().startsWith('```')) {
        code.add(lines[i].trimRight());
      }
      blocks.add(_Code(code.join('\n')));
      continue;
    }
    if (trimmed.isEmpty) {
      flush();
      continue;
    }

    final heading = _headingLine.firstMatch(trimmed);
    if (heading != null) {
      flush();
      final text = heading[2]!.trim();
      if (text.isNotEmpty) blocks.add(_Heading(heading[1]!.length, text));
      continue;
    }
    if (_ruleLine.hasMatch(trimmed)) {
      flush();
      blocks.add(const _Rule());
      continue;
    }

    final bullet = _bulletLine.firstMatch(line);
    final numbered = bullet == null ? _numberedLine.firstMatch(line) : null;
    if (bullet != null || numbered != null) {
      flush();
      var text = bullet != null ? bullet[2]! : numbered![3]!;
      bool? checked;
      final task = _taskPrefix.firstMatch(text);
      if (task != null) {
        checked = task[1] != ' ';
        text = text.substring(task.end);
      }
      blocks.add(
        _ListItem(
          depth: depthOf(bullet != null ? bullet[1]! : numbered![1]!),
          number: numbered == null ? null : int.tryParse(numbered[2]!),
          checked: checked,
          text: text.trim(),
        ),
      );
      continue;
    }

    final quote = _quoteLine.firstMatch(trimmed);
    if (quote != null) {
      flush();
      final last = blocks.isEmpty ? null : blocks.last;
      final text = quote[1]!.trim();
      if (last is _Quote && i > 0 && lines[i - 1].trimLeft().startsWith('>')) {
        last.text = '${last.text} $text'.trim();
      } else if (text.isNotEmpty) {
        blocks.add(_Quote(text));
      }
      continue;
    }

    // A wrapped line continues the list item above it.
    final last = blocks.isEmpty ? null : blocks.last;
    if (paragraph.isEmpty && last is _ListItem && line.startsWith(' ')) {
      last.text = '${last.text} $trimmed';
      continue;
    }
    paragraph.add(trimmed);
  }
  flush();
  return blocks;
}
