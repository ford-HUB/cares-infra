import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/presentation/widgets/popular_event_deck.dart';
import 'package:mobile/shared/widgets/empty_illustration.dart';
import 'package:mobile/shared/widgets/ground_card.dart';

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

  static const double height = 64;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: Padding(
        padding: EdgeInsets.fromLTRB(gutter, 6, gutter, 14),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 23,
                  fontWeight: FontWeight.w800,
                  color: onDark ? Colors.white : AppColors.deepHeaderTop,
                  letterSpacing: -0.3,
                ),
              ),
            ),
            TextButton(
              onPressed: onViewAll,
              style: TextButton.styleFrom(
                foregroundColor: onDark
                    ? AppColors.navActive
                    : const Color(0xFF4C9A2A),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                visualDensity: VisualDensity.compact,
              ),
              child: const Text(
                'VIEW ALL',
                style: TextStyle(
                  fontSize: 14,
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
    : icon = Icons.event_busy_outlined,
      title = 'Nothing Matches Yet',
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
    return GroundCard(
      wave: true,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          IconTileHeading(icon: icon, title: title, body: message),
          if (onAction != null) ...[
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.only(left: 82),
              child: Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.icon(
                  onPressed: onAction,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    textStyle: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  icon: Icon(actionIcon, size: 18),
                  label: Text(actionLabel!),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Fills the popular-deck slot on the home tabs when there is no deck to
/// show — the same height as a deck card, so the dark ground still lines up.
class HomeDeckPlaceholder extends StatelessWidget {
  const HomeDeckPlaceholder({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.gutter = 20,
  });

  final IconData icon;
  final String title;
  final String message;
  final double gutter;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: gutter),
      child: SizedBox(
        height: PopularEventDeck.cardHeight,
        child: GroundCard(
          wave: true,
          radius: 26,
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 18),
          child: Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: SizedBox(
                width: 300,
                child: EmptyStateBlock(
                  icon: icon,
                  title: title,
                  message: message,
                  illustrationSize: 96,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
