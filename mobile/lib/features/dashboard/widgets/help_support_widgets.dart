import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/help_center_data.dart';

/// Shared building blocks for the Help & Support center. All widgets are
/// presentational — they take static data and callbacks only.

/// Section heading with a leading emoji, e.g. "📚  Quick Help".
class HelpSectionHeader extends StatelessWidget {
  const HelpSectionHeader({
    super.key,
    required this.emoji,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  final String emoji;
  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(emoji, style: const TextStyle(fontSize: 18)),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              if (subtitle case final sub?) ...[
                const SizedBox(height: 2),
                Text(
                  sub,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}

/// Rounded search input used at the top of the Help & Support page.
class HelpSearchField extends StatelessWidget {
  const HelpSearchField({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onClear,
    this.focusNode,
    this.hintText = 'Search for a question or topic...',
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final FocusNode? focusNode;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppColors.textPrimary,
      ),
      decoration: InputDecoration(
        hintText: hintText,
        filled: true,
        fillColor: AppColors.surface,
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: controller.text.isEmpty
            ? null
            : IconButton(
                tooltip: 'Clear',
                onPressed: onClear,
                icon: const Icon(Icons.close_rounded, size: 20),
              ),
        contentPadding: const EdgeInsets.symmetric(
          vertical: 14,
          horizontal: 16,
        ),
      ),
    );
  }
}

/// Tappable example-search pill.
class HelpExampleChip extends StatelessWidget {
  const HelpExampleChip({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppColors.pillRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.pillRadius),
            border: Border.all(color: AppColors.borderCard),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.north_west_rounded,
                size: 13,
                color: AppColors.textMuted,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Prominent Quick Help category card (Donations / Events / Account).
class QuickHelpCard extends StatelessWidget {
  const QuickHelpCard({
    super.key,
    required this.topic,
    required this.selected,
    required this.onTap,
  });

  final HelpTopic topic;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : AppColors.surface,
      borderRadius: BorderRadius.circular(AppColors.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.borderCard,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected
                      ? Colors.white.withValues(alpha: 0.18)
                      : AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Text(topic.emoji, style: const TextStyle(fontSize: 20)),
              ),
              const SizedBox(height: 10),
              Text(
                topic.shortLabel,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: selected ? Colors.white : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                topic.blurb,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  height: 1.3,
                  color: selected
                      ? Colors.white.withValues(alpha: 0.9)
                      : AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Expandable FAQ row. Collapsed by default; animates open on tap.
class FaqExpansionTile extends StatefulWidget {
  const FaqExpansionTile({
    super.key,
    required this.article,
    this.initiallyExpanded = false,
    this.highlight = false,
  });

  final HelpArticle article;
  final bool initiallyExpanded;

  /// Draws a subtle accent border, used for search-result matches.
  final bool highlight;

  @override
  State<FaqExpansionTile> createState() => _FaqExpansionTileState();
}

class _FaqExpansionTileState extends State<FaqExpansionTile> {
  late bool _expanded = widget.initiallyExpanded;

  @override
  void didUpdateWidget(FaqExpansionTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initiallyExpanded && !oldWidget.initiallyExpanded) {
      _expanded = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: widget.highlight || _expanded
              ? AppColors.primary.withValues(alpha: 0.45)
              : AppColors.borderCard,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 13, 12, 13),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      widget.article.question,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.35,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(
                      Icons.expand_more_rounded,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 180),
            crossFadeState: _expanded
                ? CrossFadeState.showFirst
                : CrossFadeState.showSecond,
            firstChild: Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Text(
                widget.article.answer,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),
            ),
            secondChild: const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}

/// Generic navigation card used for "Need More Help?" and report options.
class HelpNavCard extends StatelessWidget {
  const HelpNavCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.emoji,
    this.icon,
    this.accent = AppColors.primary,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final String? emoji;
  final IconData? icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppColors.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(color: AppColors.borderCard),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: emoji != null
                    ? Text(emoji!, style: const TextStyle(fontSize: 19))
                    : Icon(icon, size: 20, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Small status pill for support requests.
class SupportStatusChip extends StatelessWidget {
  const SupportStatusChip({super.key, required this.status});

  final SupportRequestStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        border: Border.all(color: status.color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: status.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status.label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: status.color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Row in the "My Support Requests" list.
class SupportRequestTile extends StatelessWidget {
  const SupportRequestTile({
    super.key,
    required this.request,
    required this.onTap,
  });

  final SupportRequestSample request;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppColors.cardRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(color: AppColors.borderCard),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      request.subject,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SupportStatusChip(status: request.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${request.referenceId} · ${request.category.label}',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(
                    Icons.schedule_rounded,
                    size: 13,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    'Submitted ${request.submittedLabel}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Updated ${request.updatedLabel}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Chat-style bubble for a support conversation.
class SupportMessageBubble extends StatelessWidget {
  const SupportMessageBubble({super.key, required this.message});

  final SupportMessage message;

  @override
  Widget build(BuildContext context) {
    final isYou = message.author == SupportAuthor.you;
    return Align(
      alignment: isYou ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Column(
          crossAxisAlignment: isYou
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              isYou ? 'You' : 'CARES Support',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
              decoration: BoxDecoration(
                color: isYou ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(14),
                  topRight: const Radius.circular(14),
                  bottomLeft: Radius.circular(isYou ? 14 : 2),
                  bottomRight: Radius.circular(isYou ? 2 : 14),
                ),
                border: Border.all(
                  color: isYou ? AppColors.primary : AppColors.borderCard,
                ),
              ),
              child: Text(
                message.body,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.45,
                  color: isYou ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message.timeLabel,
              style: const TextStyle(
                fontSize: 10.5,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Frontend-only attachment control. Tapping it just simulates picking a file.
class MockAttachmentField extends StatelessWidget {
  const MockAttachmentField({
    super.key,
    required this.fileName,
    required this.onAttach,
    required this.onRemove,
  });

  final String? fileName;
  final VoidCallback onAttach;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    if (fileName != null) {
      return Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.image_outlined,
              size: 18,
              color: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                fileName!,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            IconButton(
              onPressed: onRemove,
              icon: const Icon(Icons.close_rounded, size: 18),
              tooltip: 'Remove attachment',
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      );
    }

    return OutlinedButton.icon(
      onPressed: onAttach,
      icon: const Icon(Icons.attach_file_rounded, size: 18),
      label: const Text('Add screenshot or file (optional)'),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(46),
        foregroundColor: AppColors.textPrimary,
        side: const BorderSide(color: AppColors.borderCard),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

/// Standard labelled form field wrapper.
class HelpFormField extends StatelessWidget {
  const HelpFormField({
    super.key,
    required this.label,
    required this.child,
    this.errorText,
  });

  final String label;
  final Widget child;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        child,
        if (errorText != null) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(
                Icons.error_outline_rounded,
                size: 14,
                color: AppColors.error,
              ),
              const SizedBox(width: 4),
              Text(
                errorText!,
                style: const TextStyle(fontSize: 12, color: AppColors.error),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Centered, width-limited page body so the layout also reads well on tablets
/// and desktop/web builds.
class HelpPageBody extends StatelessWidget {
  const HelpPageBody({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.fromLTRB(20, 16, 20, 32),
  });

  final List<Widget> children;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: padding,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ),
      ),
    );
  }
}
