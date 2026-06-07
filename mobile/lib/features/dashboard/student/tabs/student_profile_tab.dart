import 'package:flutter/material.dart';
import '../../../../core/session/static_user_session.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/login_screen.dart';
import '../../data/activity_data.dart';
import '../../data/donation_store.dart';
import '../../data/event_registration_store.dart';
import '../../screens/profile_screens.dart';

class StudentProfileTab extends StatefulWidget {
  const StudentProfileTab({
    super.key,
    required this.user,
    this.onNavigateToTab,
  });

  final StaticSessionUser user;
  final ValueChanged<int>? onNavigateToTab;

  @override
  State<StudentProfileTab> createState() => _StudentProfileTabState();
}

class _StudentProfileTabState extends State<StudentProfileTab> {
  final _store = EventRegistrationStore.instance;
  final _donationStore = DonationStore.instance;
  bool _notificationsEnabled = true;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
    _donationStore.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    _donationStore.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  String get _userEmail =>
      StaticUserSession.instance.currentUser?.email ?? widget.user.email;

  int get _eventsJoined {
    final count = _store.participationsForEmail(_userEmail).length;
    return count > 0 ? count : 14;
  }

  int get _eventsAttended {
    final count = _store
        .participationsForEmail(_userEmail)
        .where((p) => p.attendanceVerified)
        .length;
    return count > 0 ? count + kMockAttendedActivities.length : 11;
  }

  int get _points {
    final verified = _store
        .participationsForEmail(_userEmail)
        .where((p) => p.attendanceVerified)
        .length;
    return verified * 25;
  }

  int get _totalDonated =>
      _donationStore.totalDonatedDisplayForEmail(_userEmail);

  int get _donationsMade =>
      _donationStore.donationsCountForEmail(_userEmail);

  static const _certsEarned = 2;

  void _logout(BuildContext context) {
    StaticUserSession.instance.signOut();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  Future<void> _openNotifications() async {
    final result = await ProfileNotificationsScreen.open(
      context,
      initialEnabled: _notificationsEnabled,
    );
    if (result != null && mounted) {
      setState(() => _notificationsEnabled = result);
    }
  }

  void _openEditProfile() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => ProfileEditScreen(user: widget.user),
      ),
    );
    if (mounted) setState(() {});
  }

  void _openRanks() => widget.onNavigateToTab?.call(3);

  void _openActivities() => widget.onNavigateToTab?.call(2);

  @override
  Widget build(BuildContext context) {
    final isDonor = StaticUserSession.instance.isDonorMode;
    final modeLabel = isDonor ? 'Donor' : 'Volunteer';

    return ColoredBox(
      color: AppColors.background,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          _ProfileHeaderCard(
            user: widget.user,
            points: _points,
            modeLabel: modeLabel,
            totalDonatedLabel: DonationStore.formatPeso(_totalDonated),
            onTap: _openEditProfile,
            onEdit: _openEditProfile,
            onPointsTap: _openRanks,
            onTotalDonatedTap: () => ProfileHistoryScreen.open(context),
          ),
          const SizedBox(height: 16),
          _TotalDonatedCard(
            amount: DonationStore.formatPesoFull(_totalDonated),
            donationsCount: _donationsMade,
            onTap: () => ProfileHistoryScreen.open(context),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatTile(
                  value: '$_eventsJoined',
                  label: 'Events\nJoined',
                  onTap: _openActivities,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatTile(
                  value: '$_eventsAttended',
                  label: 'Events\nAttended',
                  onTap: () => ProfileStatDetailScreen.open(
                    context,
                    title: 'Events Attended',
                    value: '$_eventsAttended',
                    description:
                        'Total volunteer events you have completed and checked in to.',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatTile(
                  value: '$_donationsMade',
                  label: 'Donations\nMade',
                  onTap: () => ProfileHistoryScreen.open(context),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatTile(
                  value: '$_certsEarned',
                  label: 'Certs\nEarned',
                  onTap: () => ProfileCertificatesScreen.open(
                    context,
                    count: _certsEarned,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const _SectionLabel('ACCOUNT'),
          const SizedBox(height: 8),
          _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.edit_outlined,
                label: 'Edit Profile',
                onTap: _openEditProfile,
              ),
              _SettingsTile(
                icon: Icons.notifications_outlined,
                label: 'Notifications',
                onTap: _openNotifications,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Switch.adaptive(
                      value: _notificationsEnabled,
                      activeTrackColor:
                          AppColors.primary.withValues(alpha: 0.45),
                      activeThumbColor: AppColors.primary,
                      onChanged: (value) =>
                          setState(() => _notificationsEnabled = value),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.textMuted.withValues(alpha: 0.8),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const _SectionLabel('MY RECORDS'),
          const SizedBox(height: 8),
          _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.workspace_premium_outlined,
                label: 'Certificates',
                badge: '$_certsEarned',
                onTap: () => ProfileCertificatesScreen.open(
                  context,
                  count: _certsEarned,
                ),
              ),
              _SettingsTile(
                icon: Icons.bar_chart_rounded,
                label: 'Analytics',
                onTap: () => ProfileAnalyticsScreen.open(context),
              ),
              _SettingsTile(
                icon: Icons.history_rounded,
                label: 'History',
                onTap: () => ProfileHistoryScreen.open(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const _SectionLabel('SUPPORT'),
          const SizedBox(height: 8),
          _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.help_outline_rounded,
                label: 'Help and Support',
                onTap: () => ProfileHelpSupportScreen.open(context),
              ),
              _SettingsTile(
                icon: Icons.info_outline_rounded,
                label: 'About CARES',
                onTap: () => ProfileAboutScreen.open(context),
              ),
            ],
          ),
          const SizedBox(height: 28),
          TextButton.icon(
            onPressed: () => _logout(context),
            icon: const Icon(Icons.logout_rounded, size: 20),
            label: const Text('Log Out'),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.secondary,
              minimumSize: const Size.fromHeight(44),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeaderCard extends StatelessWidget {
  const _ProfileHeaderCard({
    required this.user,
    required this.points,
    required this.modeLabel,
    required this.totalDonatedLabel,
    required this.onTap,
    required this.onEdit,
    required this.onPointsTap,
    required this.onTotalDonatedTap,
  });

  final StaticSessionUser user;
  final int points;
  final String modeLabel;
  final String totalDonatedLabel;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onPointsTap;
  final VoidCallback onTotalDonatedTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.primaryLight, AppColors.primary],
            ),
          ),
          child: Stack(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.2),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.55),
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      Icons.person_rounded,
                      size: 40,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName.isEmpty ? 'Volunteer' : user.fullName,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.affiliationLine,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.88),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _HeaderBadge(
                              icon: Icons.star_rounded,
                              label: '$points pts',
                              onTap: onPointsTap,
                            ),
                        _HeaderBadge(
                          icon: Icons.volunteer_activism_rounded,
                          label: modeLabel,
                        ),
                        _HeaderBadge(
                          icon: Icons.favorite_rounded,
                          label: '$totalDonatedLabel donated',
                          onTap: onTotalDonatedTap,
                        ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 36),
                ],
              ),
              Positioned(
                top: 0,
                right: 0,
                child: Material(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(10),
                  child: InkWell(
                    onTap: onEdit,
                    borderRadius: BorderRadius.circular(10),
                    child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(
                        Icons.edit_outlined,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
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

class _TotalDonatedCard extends StatelessWidget {
  const _TotalDonatedCard({
    required this.amount,
    required this.donationsCount,
    required this.onTap,
  });

  final String amount;
  final int donationsCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.inputFill),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFE65100).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  color: Color(0xFFE65100),
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Total Donated',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      amount,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFE65100),
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '$donationsCount',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'donations',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textMuted.withValues(alpha: 0.8),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderBadge extends StatelessWidget {
  const _HeaderBadge({
    required this.icon,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return badge;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: badge,
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.value,
    required this.label,
    required this.onTap,
  });

  final String value;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.inputFill),
          ),
          child: Column(
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  height: 1,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  height: 1.25,
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: AppColors.textMuted,
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0)
              const Divider(
                height: 1,
                thickness: 1,
                indent: 56,
                color: AppColors.inputFill,
              ),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.badge,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Widget? trailing;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (badge != null) ...[
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badge!,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
              ],
              trailing ??
                  Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.8),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
