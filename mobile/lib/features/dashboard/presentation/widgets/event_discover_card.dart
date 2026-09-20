import 'package:flutter/material.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/event_category_icons.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/presentation/widgets/event_joined_count.dart';
import 'package:mobile/features/dashboard/widgets/event_image_carousel.dart';

/// Tall poster card for the events tab: a wide photo (or category-tinted
/// fallback) on top, then title, date and place, and a single call-to-action
/// pill at the bottom.
///
/// The pill mirrors the volunteer's state — "Register" when the event is
/// open, "Registered" once they have joined, "View details" after it ends —
/// and every tap on the card, pill included, opens the details screen where
/// the actual registration happens.
class EventDiscoverCard extends StatelessWidget {
  const EventDiscoverCard({
    super.key,
    required this.event,
    required this.onTap,
  });

  final CaresEvent event;
  final VoidCallback onTap;

  static const _imageAspect = 16 / 10;

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  @override
  Widget build(BuildContext context) {
    final categoryColor = eventCategoryColor(event.category);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          decoration: AppDecorations.surfaceCard(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppColors.cardRadius - 6),
                  child: AspectRatio(
                    aspectRatio: _imageAspect,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        EventImageCarousel(
                          imageUrls: event.imageUrls,
                          placeholder: _Placeholder(
                            color: categoryColor,
                            icon: eventCategoryIcon(event.category),
                          ),
                        ),
                        Positioned(
                          top: 10,
                          left: 10,
                          child: _CategoryBadge(
                            label: event.category,
                            color: categoryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 6, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                event.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  height: 1.25,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${event.monthLabel} ${event.dayLabel}, ${event.date.year} · ${event.time}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.place_rounded,
                                    size: 13,
                                    color: AppColors.textMuted,
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      event.location,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textSecondary,
                                        height: 1.2,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ListenableBuilder(
                      listenable: EventRegistrationStore.instance,
                      builder: (context, _) {
                        final registered = EventRegistrationStore.instance
                            .isRegistered(event.id, _participantEmail);
                        return _ActionPill(
                          event: event,
                          registered: registered,
                          onTap: onTap,
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionPill extends StatelessWidget {
  const _ActionPill({
    required this.event,
    required this.registered,
    required this.onTap,
  });

  final CaresEvent event;
  final bool registered;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final String label;
    final Color fill;
    final Color foreground;
    final Color border;

    if (event.hasEnded()) {
      label = 'View details';
      fill = AppColors.inputFill;
      foreground = AppColors.textPrimary;
      border = AppColors.borderLight;
    } else if (registered) {
      label = 'Registered';
      fill = AppColors.surface;
      foreground = AppColors.primary;
      border = AppColors.primary;
    } else {
      label = 'Register';
      fill = AppColors.primary;
      foreground = Colors.white;
      border = AppColors.primary;
    }

    // Countdown only while there are still days to count — on the day itself
    // "0d left" says nothing the date line doesn't, so it goes away.
    final urgent =
        !event.hasEnded() &&
        !registered &&
        event.daysUntil > 0 &&
        event.daysUntil <= 3;

    return Row(
      children: [
        Material(
          color: fill,
          shape: StadiumBorder(side: BorderSide(color: border)),
          child: InkWell(
            onTap: onTap,
            customBorder: const StadiumBorder(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (registered && !event.hasEnded()) ...[
                    Icon(Icons.check_rounded, size: 15, color: foreground),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: foreground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (urgent) ...[
          const SizedBox(width: 12),
          Text(
            event.countdownLeftLabel,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.accentOrange,
            ),
          ),
        ],
        if (!event.hasEnded()) ...[
          const SizedBox(width: 12),
          EventJoinedCount(
            joined: event.registeredCount,
            capacity: event.totalCapacity,
            showBar: false,
          ),
        ],
      ],
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: AppDecorations.softBadge(
        fill: AppColors.surface.withValues(alpha: 0.92),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.color, required this.icon});

  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.18),
            color.withValues(alpha: 0.38),
          ],
        ),
      ),
      child: Center(
        child: Icon(icon, size: 44, color: color.withValues(alpha: 0.55)),
      ),
    );
  }
}
