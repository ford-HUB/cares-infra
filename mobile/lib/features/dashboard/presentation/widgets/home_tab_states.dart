import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// "Popular Events 🔥 ......... VIEW ALL" — fixed height so the home tab can
/// size its dark ground without measuring.
class HomeSectionTitle extends StatelessWidget {
  const HomeSectionTitle({
    super.key,
    required this.title,
    required this.emoji,
    required this.onViewAll,
    this.onDark = false,
    this.gutter = 20,
  });

  final String title;
  final String emoji;
  final VoidCallback onViewAll;
  final bool onDark;
  final double gutter;

  static const double height = 56;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.fromLTRB(gutter, 4, gutter, 14),
        child: Row(
          children: [
            Expanded(
              child: Text(
                '$title $emoji',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: onDark ? Colors.white : const Color(0xFF1B1F24),
                  letterSpacing: -0.2,
                ),
              ),
            ),
            TextButton(
              onPressed: onViewAll,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.accentOrange,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                visualDensity: VisualDensity.compact,
              ),
              child: const Text(
                'VIEW ALL',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// White card the category section shows instead of a list when there is
/// nothing to list: a fetch error, no interests chosen yet, or no matches.
class HomeStateCard extends StatelessWidget {
  const HomeStateCard({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
  });

  const HomeStateCard.error({
    super.key,
    required this.message,
    required VoidCallback onRetry,
  }) : icon = Icons.wifi_off_rounded,
       title = 'Could not load events',
       actionLabel = 'Retry',
       actionIcon = Icons.refresh_rounded,
       onAction = onRetry;

  const HomeStateCard.chooseInterests({
    super.key,
    required VoidCallback onChoose,
  }) : icon = Icons.auto_awesome_rounded,
       title = 'Tell us what you care about',
       message =
           'Pick a few interests and we will surface the events that fit them here.',
       actionLabel = 'Choose interests',
       actionIcon = Icons.tune_rounded,
       onAction = onChoose;

  const HomeStateCard.noMatches({super.key})
    : icon = Icons.event_busy_rounded,
      title = 'Nothing matches yet',
      message =
          'No open events match your interests right now. Check back soon or browse all events.',
      actionLabel = null,
      actionIcon = null,
      onAction = null;

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final IconData? actionIcon;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.accentOrange.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: AppColors.accentOrange),
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
                    color: Color(0xFF1B1F24),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF6B7280),
                    height: 1.4,
                  ),
                ),
                if (onAction != null) ...[
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: onAction,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.accentOrange,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    icon: Icon(actionIcon, size: 16),
                    label: Text(actionLabel!),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
