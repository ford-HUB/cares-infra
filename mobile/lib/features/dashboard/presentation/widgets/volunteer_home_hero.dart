import 'package:flutter/material.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/screens/dashboard_notifications_screen.dart';

/// Dark band across the top of the volunteer home tab: avatar + welcome on
/// the left, the volunteer's rank on the right, and the search pill underneath.
///
/// The avatar comes from the volunteer's [RoleAccount] — the photo stream
/// `GET /profile/me/mobile` returned — and rebuilds when the store changes.
/// The rank is a mock number for now until the leaderboard endpoint lands. Paints behind the status bar, so it reads the top
/// inset itself instead of sitting inside a [SafeArea]; [height] is fixed
/// from the same numbers so the tab can extend the dark ground down behind
/// the popular deck.
class VolunteerHomeHero extends StatelessWidget {
  const VolunteerHomeHero({
    super.key,
    required this.displayName,
    required this.onSearchTap,
    required this.onFilterTap,
    this.filterActive = false,
    this.showNotificationDot = true,
  });

  final String displayName;
  final VoidCallback onSearchTap;
  final VoidCallback onFilterTap;

  /// Marks the filter button when a category other than "All" is applied.
  final bool filterActive;
  final bool showNotificationDot;

  /// Mock volunteer rank shown in the header until the leaderboard is wired.
  static const int mockRank = 12;

  /// Deep forest ground the whole header sits on.
  static const Color ink = Color(0xFF12291A);

  static const double gutter = 20;
  static const double _topPad = 12;
  static const double _avatarSize = 48;
  static const double _rowGap = 18;
  static const double _searchHeight = 50;
  static const double _bottomPad = 6;

  /// Full height including the status-bar inset.
  static double height(BuildContext context) =>
      MediaQuery.paddingOf(context).top +
      _topPad +
      _avatarSize +
      _rowGap +
      _searchHeight +
      _bottomPad;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        gutter,
        topInset + _topPad,
        gutter,
        _bottomPad,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: _avatarSize,
            child: ListenableBuilder(
              listenable: RoleAccountStore.instance,
              builder: (context, _) {
                final account = RoleAccountStore.instance.byType(
                  RoleAccountStore.volunteer,
                );
                return Row(
                  children: [
                    _Avatar(account: account, fallbackName: displayName),
                    const SizedBox(width: 12),
                    Expanded(child: _Welcome(name: displayName)),
                    const SizedBox(width: 8),
                    const _RankBlock(rank: mockRank),
                    _NotificationBell(showDot: showNotificationDot),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: _rowGap),
          SizedBox(
            height: _searchHeight,
            child: Row(
              // Stretch so the pill fills the row height instead of
              // shrinking to its icon.
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _SearchPill(onTap: onSearchTap)),
                const SizedBox(width: 12),
                _FilterButton(onTap: onFilterTap, active: filterActive),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hi Welcome 👋',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            letterSpacing: -0.2,
          ),
        ),
      ],
    );
  }
}

/// The role's photo stream when one is on file (private, so the request
/// carries the token), otherwise initials on the role colour.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.account, required this.fallbackName});

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

    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.18),
          width: 2,
        ),
      ),
      child: CircleAvatar(
        radius: (VolunteerHomeHero._avatarSize - 8) / 2,
        backgroundColor: account?.avatarColor ?? AppColors.primary,
        backgroundImage: image,
        child: image == null
            ? Text(
                _initials(account?.displayName ?? fallbackName),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              )
            : null,
      ),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    final initials = parts.take(2).map((p) => p[0].toUpperCase()).join();
    return initials.isEmpty ? 'V' : initials;
  }
}

class _RankBlock extends StatelessWidget {
  const _RankBlock({required this.rank});

  final int rank;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          'Your rank',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '#$rank',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 3),
            const Icon(
              Icons.emoji_events_rounded,
              size: 14,
              color: AppColors.accentOrange,
            ),
          ],
        ),
      ],
    );
  }
}

class _NotificationBell extends StatelessWidget {
  const _NotificationBell({required this.showDot});

  final bool showDot;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          onPressed: () => DashboardNotificationsScreen.open(context),
          icon: const Icon(Icons.notifications_none_rounded),
          color: Colors.white,
          tooltip: 'Notifications',
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.all(6),
          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
        ),
        if (showDot)
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.accentOrange,
                shape: BoxShape.circle,
              ),
            ),
          ),
      ],
    );
  }
}

/// Translucent search affordance; tapping hands off to the Events tab,
/// which owns the real search.
class _SearchPill extends StatelessWidget {
  const _SearchPill({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
          child: Row(
            children: [
              Icon(
                Icons.search_rounded,
                size: 22,
                color: Colors.white.withValues(alpha: 0.85),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Find amazing events',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.onTap, required this.active});

  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: active
              ? AppColors.accentOrange
              : Colors.white.withValues(alpha: 0.12),
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          width: VolunteerHomeHero._searchHeight,
          height: VolunteerHomeHero._searchHeight,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              const Center(
                child: Icon(Icons.tune_rounded, size: 22, color: Colors.white),
              ),
              if (active)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.accentOrange,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
