import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_reminder_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

const Color kEventInk = Color(0xFF1B1F24);
const Color kEventMuted = Color(0xFF6B7280);

/// Round translucent button that sits over the hero photo (back, save).
class EventHeroButton extends StatelessWidget {
  const EventHeroButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.color = Colors.white,
    this.tooltip,
  });

  final IconData icon;
  final VoidCallback onTap;
  final Color color;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.32),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Tooltip(
          message: tooltip ?? '',
          child: SizedBox(
            width: 40,
            height: 40,
            child: Icon(icon, size: 20, color: color),
          ),
        ),
      ),
    );
  }
}

/// The white card that straddles the hero's bottom edge with the three
/// quick actions: who's going, how to get there, and the email reminder.
class EventActionCard extends StatelessWidget {
  const EventActionCard({
    super.key,
    required this.eventId,
    required this.onParticipants,
    required this.onDirections,
    required this.onReminder,
  });

  final String eventId;
  final VoidCallback onParticipants;
  final VoidCallback onDirections;
  final VoidCallback onReminder;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      elevation: 8,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            Expanded(
              child: _Action(
                icon: Icons.people_alt_rounded,
                tint: AppColors.accentOrange,
                label: 'Participants',
                onTap: onParticipants,
              ),
            ),
            const _ActionDivider(),
            Expanded(
              child: _Action(
                icon: Icons.directions_rounded,
                tint: const Color(0xFF1E88E5),
                label: 'Directions',
                onTap: onDirections,
              ),
            ),
            const _ActionDivider(),
            Expanded(
              child: ListenableBuilder(
                listenable: EventReminderStore.instance,
                builder: (context, _) {
                  final r = EventReminderStore.instance.reminderFor(eventId);
                  return _Action(
                    icon: r.enabled
                        ? Icons.notifications_active_rounded
                        : Icons.notifications_off_outlined,
                    tint: r.enabled ? AppColors.warning : kEventMuted,
                    label: 'Reminder',
                    sub: r.enabled
                        ? (r.daysBefore == 7
                              ? '1 wk before'
                              : '${r.daysBefore}d before')
                        : 'Off',
                    onTap: onReminder,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.tint,
    required this.label,
    required this.onTap,
    this.sub,
  });

  final IconData icon;
  final Color tint;
  final String label;
  final String? sub;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: tint.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(color: tint.withValues(alpha: 0.18)),
              ),
              child: Icon(icon, size: 26, color: tint),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: kEventInk,
              ),
            ),
            SizedBox(
              height: 14,
              child: sub == null
                  ? null
                  : Text(
                      sub!,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: kEventMuted,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionDivider extends StatelessWidget {
  const _ActionDivider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 44, color: const Color(0xFFF0F1F3));
  }
}

/// Outlined status pill beside the title ("REGISTERED", "COMPLETED").
class EventStatusPill extends StatelessWidget {
  const EventStatusPill({super.key, required this.label, this.color});

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.accentOrange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: c.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
          color: c,
        ),
      ),
    );
  }
}

/// "38 Members are joined:" with a stack of avatar discs and an orange
/// "+N" overflow disc. Reads "Be the first to join" while nobody has
/// registered.
class EventMembersRow extends StatelessWidget {
  const EventMembersRow({
    super.key,
    required this.count,
    required this.capacity,
  });

  final int count;
  final int capacity;

  static const _size = 30.0;
  static const _overlap = 10.0;
  static const _maxDiscs = 3;

  @override
  Widget build(BuildContext context) {
    final discs = count.clamp(0, _maxDiscs);
    final overflow = count - discs;
    final slots = discs + (overflow > 0 ? 1 : 0);

    return Row(
      children: [
        Expanded(
          child: count == 0
              ? const Text(
                  'Be the first to join this event',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: kEventMuted,
                  ),
                )
              : Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: _compact(count),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: kEventInk,
                        ),
                      ),
                      const TextSpan(text: ' Members are joined:'),
                    ],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13.5, color: kEventMuted),
                ),
        ),
        if (slots > 0) ...[
          const SizedBox(width: 8),
          SizedBox(
            width: _size + (slots - 1) * (_size - _overlap),
            height: _size,
            child: Stack(
              children: [
                for (var i = 0; i < discs; i++)
                  Positioned(
                    left: i * (_size - _overlap),
                    child: _Disc(
                      color: AppColors.communityRing[i],
                      child: const Icon(
                        Icons.person_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                  ),
                if (overflow > 0)
                  Positioned(
                    left: discs * (_size - _overlap),
                    child: _Disc(
                      color: AppColors.accentOrange,
                      child: Text(
                        '+${_compact(overflow)}',
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  /// 15700 → "15.7k", 999 → "999".
  static String _compact(int n) {
    if (n < 1000) return '$n';
    final k = n / 1000;
    final text = k >= 10 ? k.round().toString() : k.toStringAsFixed(1);
    return '${text.replaceAll(RegExp(r'\.0$'), '')}k';
  }
}

class _Disc extends StatelessWidget {
  const _Disc({required this.color, required this.child});

  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: EventMembersRow._size,
      height: EventMembersRow._size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      alignment: Alignment.center,
      child: child,
    );
  }
}

/// One-line "Organized by" row: small initials avatar and the name, no
/// card. Server events carry no organizer blurb, so the row only grows a
/// chevron (and the expandable text under it) when [description] exists.
class EventOrganizerRow extends StatelessWidget {
  const EventOrganizerRow({
    super.key,
    required this.name,
    required this.expanded,
    required this.onToggle,
    this.description,
  });

  final String name;
  final String? description;
  final bool expanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final blurb = description?.trim() ?? '';
    final hasBlurb = blurb.isNotEmpty;
    final initial = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();

    final row = Row(
      children: [
        CircleAvatar(
          radius: 17,
          backgroundColor: AppColors.primary,
          child: Text(
            initial,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 14,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                const TextSpan(
                  text: 'Organized by ',
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: kEventMuted,
                  ),
                ),
                TextSpan(
                  text: name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: kEventInk,
                  ),
                ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 14),
          ),
        ),
        if (hasBlurb)
          AnimatedRotation(
            turns: expanded ? 0.5 : 0,
            duration: const Duration(milliseconds: 180),
            child: const Icon(
              Icons.expand_more_rounded,
              size: 22,
              color: kEventMuted,
            ),
          ),
      ],
    );

    if (!hasBlurb) return row;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(
          onTap: onToggle,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: row,
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 180),
          alignment: Alignment.topCenter,
          child: expanded
              ? Padding(
                  padding: const EdgeInsets.only(top: 8, left: 44),
                  child: Text(
                    blurb,
                    style: const TextStyle(
                      fontSize: 13.5,
                      height: 1.5,
                      color: kEventMuted,
                    ),
                  ),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }
}

/// Bold section heading used down the details body.
class EventSectionTitle extends StatelessWidget {
  const EventSectionTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w800,
        color: kEventInk,
        letterSpacing: -0.2,
      ),
    );
  }
}

/// When and where, as two labelled rows in one card, with the countdown
/// pinned to the date row so "Today" / "In 3 days" reads at a glance.
class EventInfoCard extends StatelessWidget {
  const EventInfoCard({super.key, required this.event});

  final CaresEvent event;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          _InfoRow(
            icon: Icons.calendar_month_rounded,
            tint: AppColors.accentOrange,
            label: 'Date & time',
            value: '${event.longDateLabel} · ${event.time}',
            trailing: event.hasEnded()
                ? null
                : event.isOngoing()
                ? const _OngoingPill()
                : _CountdownPill(daysUntil: event.daysUntil),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1, color: Color(0xFFF0F1F3)),
          ),
          _InfoRow(
            icon: Icons.place_rounded,
            tint: const Color(0xFF1E88E5),
            label: 'Venue',
            value: event.location,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.tint,
    required this.label,
    required this.value,
    this.trailing,
  });

  final IconData icon;
  final Color tint;
  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: tint.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 22, color: tint),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: kEventMuted,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: kEventInk,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 10), trailing!],
      ],
    );
  }
}

class _CountdownPill extends StatelessWidget {
  const _CountdownPill({required this.daysUntil});

  final int daysUntil;

  @override
  Widget build(BuildContext context) {
    final soon = daysUntil <= 3;
    final color = soon ? AppColors.accentOrange : AppColors.primary;
    final label = daysUntil == 0
        ? 'Today'
        : daysUntil == 1
        ? 'Tomorrow'
        : 'In $daysUntil days';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
  }
}

/// Replaces the countdown once the event has started: a pulsing-dot pill
/// so "in progress" reads as live rather than as another date.
class _OngoingPill extends StatelessWidget {
  const _OngoingPill();

  @override
  Widget build(BuildContext context) {
    const color = AppColors.accentOrange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 8, color: color),
          SizedBox(width: 6),
          Text(
            'Happening now',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Floating footer for an event the volunteer hasn't joined: the slot
/// count on the left so the decision and its context sit together, the
/// dark "Register Now" on the right.
class EventRegisterBar extends StatelessWidget {
  const EventRegisterBar({
    super.key,
    required this.slotsLeft,
    required this.capacity,
    required this.onRegister,
  });

  final int slotsLeft;
  final int capacity;
  final VoidCallback? onRegister;

  @override
  Widget build(BuildContext context) {
    final full = slotsLeft == 0;
    final scarce = !full && slotsLeft <= 5;
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 12, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.16),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  full ? 'No slots left' : 'Slots left',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: kEventMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '$slotsLeft',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: scarce ? AppColors.accentOrange : kEventInk,
                        ),
                      ),
                      if (capacity > 0)
                        TextSpan(
                          text: ' / $capacity',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: kEventMuted,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: onRegister,
            style: FilledButton.styleFrom(
              backgroundColor: kEventInk,
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFFE5E7EB),
              disabledForegroundColor: kEventMuted,
              minimumSize: const Size(0, 50),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
            icon: Icon(
              full ? Icons.block_rounded : Icons.how_to_reg_rounded,
              size: 18,
            ),
            label: Text(full ? 'Event full' : 'Register Now'),
          ),
        ],
      ),
    );
  }
}
