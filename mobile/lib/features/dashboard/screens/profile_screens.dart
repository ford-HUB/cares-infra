import 'package:flutter/material.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/certificate_data.dart';
import '../data/event_feedback_store.dart';
import 'certificate_review_screen.dart';
import 'help_support_screen.dart';
export 'profile_analytics_screen.dart';
export 'profile_edit_screen.dart';

class ProfileNotificationsScreen extends StatefulWidget {
  const ProfileNotificationsScreen({super.key, required this.initialEnabled});

  final bool initialEnabled;

  static Future<bool?> open(
    BuildContext context, {
    required bool initialEnabled,
  }) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) =>
            ProfileNotificationsScreen(initialEnabled: initialEnabled),
      ),
    );
  }

  @override
  State<ProfileNotificationsScreen> createState() =>
      _ProfileNotificationsScreenState();
}

class _ProfileNotificationsScreenState
    extends State<ProfileNotificationsScreen> {
  late bool _enabled = widget.initialEnabled;
  bool _eventReminders = true;
  bool _activityUpdates = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _ToggleCard(
            title: 'Push notifications',
            subtitle: 'Receive alerts about events and activities.',
            value: _enabled,
            onChanged: (value) => setState(() => _enabled = value),
          ),
          const SizedBox(height: 12),
          _ToggleCard(
            title: 'Event reminders',
            subtitle: 'Get reminded before joined events start.',
            value: _eventReminders,
            onChanged: _enabled
                ? (value) => setState(() => _eventReminders = value)
                : null,
          ),
          const SizedBox(height: 12),
          _ToggleCard(
            title: 'Activity updates',
            subtitle: 'Points, certificates, and attendance updates.',
            value: _activityUpdates,
            onChanged: _enabled
                ? (value) => setState(() => _activityUpdates = value)
                : null,
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: FilledButton(
            onPressed: () => Navigator.of(context).pop(_enabled),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(48),
            ),
            child: const Text('Save'),
          ),
        ),
      ),
    );
  }
}

/// The volunteer's certificate wallet: every certificate they have received.
class ProfileCertificatesScreen extends StatefulWidget {
  const ProfileCertificatesScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const ProfileCertificatesScreen(),
      ),
    );
  }

  @override
  State<ProfileCertificatesScreen> createState() =>
      _ProfileCertificatesScreenState();
}

class _ProfileCertificatesScreenState extends State<ProfileCertificatesScreen> {
  final _feedbackStore = EventFeedbackStore.instance;

  @override
  void initState() {
    super.initState();
    _feedbackStore.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _feedbackStore.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final certificates = earnedCertificatesFor(certificateWalletEmail());

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Certificates'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: certificates.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'No certificates earned yet. Complete an event and submit '
                  'your feedback to receive one.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: certificates.length + 1,
              separatorBuilder: (_, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      '${certificates.length} certificate'
                      '${certificates.length == 1 ? '' : 's'} received',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  );
                }
                return _CertificateListTile(
                  certificate: certificates[index - 1],
                );
              },
            ),
    );
  }
}

/// Email the certificate wallet is keyed on for the static prototype.
String certificateWalletEmail() =>
    StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

class _CertificateListTile extends StatelessWidget {
  const _CertificateListTile({required this.certificate});

  final CaresCertificate certificate;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => CertificateReviewScreen.open(context, certificate),
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.inputFill),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.workspace_premium_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      certificate.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      certificate.issuedMonthYear,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => downloadCertificate(context, certificate),
                icon: const Icon(Icons.download_rounded),
                color: AppColors.primary,
                tooltip: 'Download certificate',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ProfileHistoryScreen extends StatelessWidget {
  const ProfileHistoryScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ProfileHistoryScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _ProfileListScreen(
      title: 'History',
      items: const [
        _ListEntry(
          icon: Icons.event_note_outlined,
          title: 'Joined Coastal Cleanup Drive',
          subtitle: 'Jun 10, 2026',
        ),
        _ListEntry(
          icon: Icons.check_circle_outline,
          title: 'Attended School Supplies Distribution',
          subtitle: 'Jun 21, 2026',
        ),
        _ListEntry(
          icon: Icons.favorite_outline,
          title: 'Donation to CARES Health Fund',
          subtitle: 'May 15, 2026 · ₱500',
        ),
        _ListEntry(
          icon: Icons.check_circle_outline,
          title: 'Attended Medical Mission — Minglanilla',
          subtitle: 'Jun 28, 2026',
        ),
      ],
    );
  }
}

class ProfileHelpSupportScreen extends StatelessWidget {
  const ProfileHelpSupportScreen({super.key});

  static void open(BuildContext context) => HelpSupportScreen.open(context);

  @override
  Widget build(BuildContext context) => const HelpSupportScreen();
}

class ProfileAboutScreen extends StatelessWidget {
  const ProfileAboutScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const ProfileAboutScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('About CARES'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primaryLight, AppColors.primary],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CARES',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Community Action and Resource Engagement System',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'CARES connects volunteers and donors with community programs '
            'in education, health, and the environment. Track your impact, '
            'join events, and earn recognition for making a difference.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          _InfoCard(
            rows: [
              _InfoRow('Version', '1.0.0 (Prototype)'),
              _InfoRow('Organization', 'CARES Community Network'),
              _InfoRow('Region', 'Cebu, Philippines'),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfileStatDetailScreen extends StatelessWidget {
  const ProfileStatDetailScreen({
    super.key,
    required this.title,
    required this.value,
    required this.description,
  });

  final String title;
  final String value;
  final String description;

  static void open(
    BuildContext context, {
    required String title,
    required String value,
    required String description,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProfileStatDetailScreen(
          title: title,
          value: value,
          description: description,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              description,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileListScreen extends StatelessWidget {
  const _ProfileListScreen({required this.title, required this.items});

  final String title;
  final List<_ListEntry> items;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: items.isEmpty
          ? Center(
              child: const Text(
                'Nothing to show yet.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: items.length,
              separatorBuilder: (_, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];
                return Material(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    onTap: () {},
                    borderRadius: BorderRadius.circular(16),
                    child: Ink(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.inputFill),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              item.icon,
                              size: 20,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                if (item.subtitle != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    item.subtitle!,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}

class _ListEntry {
  const _ListEntry({required this.icon, required this.title, this.subtitle});

  final IconData icon;
  final String title;
  final String? subtitle;
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.rows});

  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: 20, color: AppColors.inputFill),
            rows[i],
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}

class _ToggleCard extends StatelessWidget {
  const _ToggleCard({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            activeTrackColor: AppColors.primary.withValues(alpha: 0.45),
            activeThumbColor: AppColors.primary,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
