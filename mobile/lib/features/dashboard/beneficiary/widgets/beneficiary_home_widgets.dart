import 'package:flutter/material.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/providers/beneficiary_request_counts_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_event_image.dart';
import 'package:mobile/shared/widgets/ground_card.dart';
import 'package:mobile/features/dashboard/screens/dashboard_notifications_screen.dart';

/// Building blocks of the beneficiary home — the "assistance hub" layout:
/// a greeting and request-status panel on the deep band, one floating
/// assistance card over the band's edge, then a sideways strip of events.
/// Same deep-green family as the volunteer and donor homes, but organised
/// around requests instead of an event deck.

/// Greeting row + request-status panel, painted on the deep ground the tab
/// lays behind it. Reads the status-bar inset itself.
class BeneficiaryHomeHero extends StatelessWidget {
  const BeneficiaryHomeHero({
    super.key,
    required this.firstName,
    required this.counts,
  });

  final String firstName;

  /// Null while loading or after a failed fetch — the panel shows dashes.
  final BeneficiaryRequestCounts? counts;

  static const double gutter = 20;

  static String _greeting(int hour) {
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    return Padding(
      padding: EdgeInsets.fromLTRB(gutter, topInset + 12, gutter, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              ListenableBuilder(
                listenable: RoleAccountStore.instance,
                builder: (context, _) => _HeroAvatar(
                  account: RoleAccountStore.instance.byType(
                    RoleAccountStore.beneficiary,
                  ),
                  fallbackName: firstName,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _greeting(DateTime.now().hour),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.white.withValues(alpha: 0.88),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      firstName.isEmpty ? 'Welcome' : firstName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 23,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        height: 1.1,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
              ),
              const _HeroBell(),
            ],
          ),
          const SizedBox(height: 18),
          RequestStatusPanel(counts: counts),
        ],
      ),
    );
  }
}

/// Glassy panel on the deep band: "Your requests" with the active count,
/// then Pending │ Approved │ Completed as big white numbers. Replaces the
/// three white stat cards so the numbers read as part of the header.
class RequestStatusPanel extends StatelessWidget {
  const RequestStatusPanel({super.key, required this.counts});

  final BeneficiaryRequestCounts? counts;

  @override
  Widget build(BuildContext context) {
    final c = counts;
    String value(int Function(BeneficiaryRequestCounts c) pick) =>
        c == null ? '–' : '${pick(c)}';
    final divider = Container(
      width: 1.2,
      margin: const EdgeInsets.symmetric(horizontal: 12),
      color: Colors.white.withValues(alpha: 0.22),
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: AppColors.onHeaderField,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                Icons.receipt_long_outlined,
                size: 17,
                color: Colors.white.withValues(alpha: 0.9),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Your requests',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
              ),
              if (c != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: const ShapeDecoration(
                    color: AppColors.navActive,
                    shape: StadiumBorder(),
                  ),
                  child: Text(
                    '${c.pending + c.approved} active',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors.deepHeaderTop,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          IntrinsicHeight(
            child: Row(
              children: [
                _StatusCell(
                  icon: Icons.hourglass_top_rounded,
                  tint: AppColors.amberOnDark,
                  value: value((c) => c.pending),
                  label: 'Pending',
                ),
                divider,
                _StatusCell(
                  icon: Icons.verified_outlined,
                  tint: AppColors.navActive,
                  value: value((c) => c.approved),
                  label: 'Approved',
                ),
                divider,
                _StatusCell(
                  icon: Icons.task_alt_rounded,
                  tint: Colors.white,
                  value: value((c) => c.completed),
                  label: 'Completed',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusCell extends StatelessWidget {
  const _StatusCell({
    required this.icon,
    required this.tint,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color tint;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(icon, size: 14, color: tint),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.82),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroAvatar extends StatelessWidget {
  const _HeroAvatar({required this.account, required this.fallbackName});

  final RoleAccount? account;
  final String fallbackName;

  @override
  Widget build(BuildContext context) {
    final url = account?.avatarUrl;
    final asset = account?.avatarAssetPath;
    final ImageProvider? image = url != null
        ? NetworkImage(url, headers: ProfileService().avatarHeaders)
        : asset != null
        ? AssetImage(asset)
        : null;
    final name = account?.displayName ?? fallbackName;
    final initial = name.trim().isEmpty ? 'B' : name.trim()[0].toUpperCase();

    return Container(
      width: 52,
      height: 52,
      padding: const EdgeInsets.all(2.5),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.9),
      ),
      child: CircleAvatar(
        backgroundColor: account?.avatarColor ?? AppColors.primary,
        backgroundImage: image,
        onBackgroundImageError: image == null ? null : (_, _) {},
        child: image == null
            ? Text(
                initial,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              )
            : null,
      ),
    );
  }
}

/// Bell in a glassy circle; the dot follows the feed's unread count.
class _HeroBell extends StatelessWidget {
  const _HeroBell();

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: NotificationSync.instance,
      builder: (context, _) {
        final unread = NotificationSync.instance.unread > 0;
        return Stack(
          clipBehavior: Clip.none,
          children: [
            Material(
              color: AppColors.onHeaderField,
              shape: const CircleBorder(),
              child: IconButton(
                onPressed: () => DashboardNotificationsScreen.open(context),
                icon: const Icon(Icons.notifications_none_rounded, size: 24),
                color: Colors.white,
                tooltip: 'Notifications',
              ),
            ),
            if (unread)
              Positioned(
                top: 9,
                right: 10,
                child: Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: AppColors.navActive,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.deepHeaderTop,
                      width: 1.5,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Sideways strip of compact event cards — photo, category pill, title,
/// date and place. Bleeds to the screen edge; [gutter] lines the first card
/// up with the page margin.
class BeneficiaryEventStrip extends StatelessWidget {
  const BeneficiaryEventStrip({
    super.key,
    required this.events,
    required this.onOpen,
    this.gutter = 20,
  });

  final List<RecommendedEvent> events;
  final ValueChanged<RecommendedEvent> onOpen;
  final double gutter;

  static const double cardWidth = 228;
  static const double height = 242;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.fromLTRB(gutter, 0, gutter, 6),
        clipBehavior: Clip.none,
        itemCount: events.length,
        separatorBuilder: (context, index) => const SizedBox(width: 14),
        itemBuilder: (context, i) => SizedBox(
          width: cardWidth,
          child: _StripCard(event: events[i], onTap: () => onOpen(events[i])),
        ),
      ),
    );
  }
}

/// Card outlines while the beneficiary events load.
class BeneficiaryEventStripSkeleton extends StatelessWidget {
  const BeneficiaryEventStripSkeleton({super.key, this.gutter = 20});

  final double gutter;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: BeneficiaryEventStrip.height,
      child: SkeletonLoader(
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(gutter, 0, gutter, 6),
          itemCount: 2,
          separatorBuilder: (context, index) => const SizedBox(width: 14),
          itemBuilder: (context, index) => const SkeletonBox(
            width: BeneficiaryEventStrip.cardWidth,
            height: BeneficiaryEventStrip.height - 6,
            radius: 20,
          ),
        ),
      ),
    );
  }
}

class _StripCard extends StatelessWidget {
  const _StripCard({required this.event, required this.onTap});

  final RecommendedEvent event;
  final VoidCallback onTap;

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  @override
  Widget build(BuildContext context) {
    final d = event.startsAt;
    final tint = eventCategoryColor(event.category);
    const meta = TextStyle(fontSize: 12, color: AppColors.textSecondary);

    return GroundCard(
      radius: 20,
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 118,
            child: Stack(
              fit: StackFit.expand,
              children: [
                HomeEventImage(event: event, iconSize: 30),
                if (event.category.trim().isNotEmpty)
                  Positioned(
                    left: 10,
                    top: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: ShapeDecoration(
                        color: tint,
                        shape: const StadiumBorder(),
                      ),
                      child: Text(
                        event.category,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      height: 1.25,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 13,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${_months[d.month - 1]} ${d.day}, ${d.year}',
                        style: meta,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.place_outlined,
                        size: 14,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          event.location,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: meta,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
