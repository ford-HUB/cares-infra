import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../data/help_center_data.dart';
import '../presentation/providers/support_requests_provider.dart';
import '../widgets/help_support_widgets.dart';

/// Help & Support center. The FAQ is static content; support requests go
/// through [supportRequestsProvider] to `v1/support-tickets/me`.
class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const HelpSupportScreen()));
  }

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

/// Server messages are already user-facing; anything else gets one line.
String describeSupportError(Object error) => error is ApiException
    ? error.message
    : 'Something went wrong. Please try again.';

void showSupportSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  final _faqSectionKey = GlobalKey();

  String _query = '';
  HelpTopic? _focusedTopic;
  bool _searchFocused = false;

  /// Anchors the suggestion dropdown to the search field.
  final _searchLink = LayerLink();
  final _suggestionsController = OverlayPortalController();

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(_onSearchFocusChanged);
  }

  @override
  void dispose() {
    _searchFocusNode.removeListener(_onSearchFocusChanged);
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onSearchFocusChanged() {
    if (_searchFocused != _searchFocusNode.hasFocus) {
      setState(() => _searchFocused = _searchFocusNode.hasFocus);
      _syncSuggestions();
    }
  }

  /// Dropdown shows only while the field is focused and still empty.
  void _syncSuggestions() {
    final show = _searchFocused && !_isSearching;
    if (show && !_suggestionsController.isShowing) {
      _suggestionsController.show();
    } else if (!show && _suggestionsController.isShowing) {
      _suggestionsController.hide();
    }
  }

  bool get _isSearching => _query.trim().isNotEmpty;

  void _runSearch(String value) {
    setState(() => _query = value);
    _syncSuggestions();
  }

  void _clearSearch() {
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() => _query = '');
    _syncSuggestions();
  }

  void _applyExample(String example) {
    _searchController.text = example;
    _searchController.selection = TextSelection.collapsed(
      offset: example.length,
    );
    setState(() => _query = example);
    _searchFocusNode.unfocus();
    _syncSuggestions();
  }

  void _selectTopic(HelpTopic topic) {
    setState(() {
      _focusedTopic = _focusedTopic == topic ? null : topic;
      if (_isSearching) {
        _searchController.clear();
        _query = '';
      }
    });
    _searchFocusNode.unfocus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _faqSectionKey.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(
          ctx,
          duration: const Duration(milliseconds: 320),
          curve: Curves.easeOutCubic,
          alignment: 0.02,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Help & Support'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: GestureDetector(
        onTap: () => _searchFocusNode.unfocus(),
        child: HelpPageBody(
          children: [
            _buildSearchSection(),
            const SizedBox(height: 24),
            if (_isSearching)
              _buildSearchResults()
            else ...[
              _buildQuickActions(),
              const SizedBox(height: 26),
              _buildQuickHelp(),
              const SizedBox(height: 26),
              _buildFaqSection(),
              const SizedBox(height: 26),
              _buildNeedMoreHelp(),
            ],
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------- Search
  Widget _buildSearchSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'What can we help you with?',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            height: 1.25,
          ),
        ),
        const SizedBox(height: 14),
        CompositedTransformTarget(
          link: _searchLink,
          child: OverlayPortal(
            controller: _suggestionsController,
            overlayChildBuilder: (_) => _SearchSuggestionsDropdown(
              link: _searchLink,
              examples: kExampleSearches,
              onSelect: _applyExample,
            ),
            child: HelpSearchField(
              controller: _searchController,
              focusNode: _searchFocusNode,
              onChanged: _runSearch,
              onClear: _clearSearch,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchResults() {
    final results = searchHelpArticles(_query);

    if (results.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          border: Border.all(color: AppColors.borderCard),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.search_off_rounded,
              size: 36,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 10),
            Text(
              'No results for "${_query.trim()}"',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Try different words, browse Quick Help, or contact our support '
              'team directly.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => ContactSupportScreen.open(context),
              icon: const Icon(Icons.support_agent_rounded, size: 18),
              label: const Text('Contact Support'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${results.length} result${results.length == 1 ? '' : 's'}',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 10),
        for (final article in results) ...[
          _SearchResultTile(article: article),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 6),
        _StillStuckCard(onContact: () => ContactSupportScreen.open(context)),
      ],
    );
  }

  // -------------------------------------------------------- Quick Actions
  /// Two things people open Help for most: filing a bug and checking on a
  /// request they already filed. Both sit above the fold on purpose.
  Widget _buildQuickActions() {
    return Consumer(
      builder: (context, ref, _) {
        final requests = ref.watch(supportRequestsProvider).value ?? const [];
        return _buildQuickActionsFor(SupportRequestSummary.of(requests));
      },
    );
  }

  Widget _buildQuickActionsFor(SupportRequestSummary summary) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: _QuickActionCard(
                icon: Icons.bug_report_outlined,
                title: 'Report a Bug',
                subtitle: 'Something broken? Tell us.',
                accent: AppColors.accentOrange,
                onTap: () => ReportBugScreen.open(context),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _QuickActionCard(
                icon: Icons.mark_email_unread_outlined,
                title: 'My Requests',
                subtitle: summary.unresolved == 0
                    ? 'Nothing open right now'
                    : '${summary.unresolved} open',
                badge: summary.needsAction,
                onTap: () => MySupportRequestsScreen.open(context),
              ),
            ),
          ],
        ),
        if (summary.needsAction > 0) ...[
          const SizedBox(height: 12),
          _NeedsActionStrip(
            count: summary.needsAction,
            onTap: () => MySupportRequestsScreen.open(
              context,
              initialFilter: SupportRequestFilter.needsAction,
            ),
          ),
        ],
      ],
    );
  }

  // ----------------------------------------------------------- Quick Help
  Widget _buildQuickHelp() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const HelpSectionHeader(
          icon: Icons.menu_book_outlined,
          title: 'Quick Help',
          subtitle: 'Jump straight to the answers people ask for most.',
        ),
        const SizedBox(height: 14),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < kQuickHelpTopics.length; i++) ...[
                if (i > 0) const SizedBox(width: 10),
                Expanded(
                  child: QuickHelpCard(
                    topic: kQuickHelpTopics[i],
                    selected: _focusedTopic == kQuickHelpTopics[i],
                    onTap: () => _selectTopic(kQuickHelpTopics[i]),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // ------------------------------------------------------------------ FAQ
  Widget _buildFaqSection() {
    final topics = _focusedTopic == null ? HelpTopic.values : [_focusedTopic!];

    return Column(
      key: _faqSectionKey,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HelpSectionHeader(
          icon: Icons.help_outline_rounded,
          title: 'Frequently Asked Questions (FAQ)',
          subtitle: _focusedTopic == null
              ? 'Tap a question to see the answer.'
              : 'Showing ${_focusedTopic!.label}',
          trailing: _focusedTopic == null
              ? null
              : TextButton(
                  onPressed: () => setState(() => _focusedTopic = null),
                  child: const Text('Show all'),
                ),
        ),
        const SizedBox(height: 14),
        for (var t = 0; t < topics.length; t++) ...[
          if (t > 0) const SizedBox(height: 20),
          _FaqGroup(topic: topics[t]),
        ],
      ],
    );
  }

  // -------------------------------------------------------- Need More Help
  Widget _buildNeedMoreHelp() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const HelpSectionHeader(
            icon: Icons.support_agent_rounded,
            title: 'Need More Help?',
            subtitle:
                "Can't find your answer above? These options are here for "
                'you.',
          ),
          const SizedBox(height: 14),
          HelpNavCard(
            icon: Icons.bug_report_outlined,
            title: 'Report a Bug',
            subtitle: 'App crashes, errors, or something not working',
            accent: AppColors.accentOrange,
            onTap: () => ReportBugScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            icon: Icons.lightbulb_outline_rounded,
            title: 'Suggest a Feature',
            subtitle: 'Share an idea to make CARES better',
            onTap: () => SupportMessageFormScreen.open(
              context,
              initialType: SupportTicketType.featureRequest,
            ),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            icon: Icons.mark_email_unread_outlined,
            title: 'My Support Requests',
            subtitle: 'Track status, replies, and confirm fixes',
            onTap: () => MySupportRequestsScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            icon: Icons.report_gmailerrorred_rounded,
            title: 'Report a Problem',
            subtitle: 'Flag suspicious or inappropriate activity',
            accent: AppColors.error,
            onTap: () => ReportProblemScreen.open(context),
          ),
        ],
      ),
    );
  }
}

/// Floating "Try searching for" list anchored under the search field. Lives
/// in the overlay so it covers the content below instead of pushing it down.
class _SearchSuggestionsDropdown extends StatelessWidget {
  const _SearchSuggestionsDropdown({
    required this.link,
    required this.examples,
    required this.onSelect,
  });

  final LayerLink link;
  final List<String> examples;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final width = link.leaderSize?.width ?? 0;
    return Positioned(
      width: width,
      child: CompositedTransformFollower(
        link: link,
        showWhenUnlinked: false,
        targetAnchor: Alignment.bottomLeft,
        followerAnchor: Alignment.topLeft,
        offset: const Offset(0, 6),
        child: Material(
          color: AppColors.surface,
          elevation: 6,
          shadowColor: AppColors.primary.withValues(alpha: 0.25),
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderCard),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(14, 12, 14, 6),
                  child: Text(
                    'Try searching for:',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
                for (var i = 0; i < examples.length; i++) ...[
                  if (i > 0)
                    const Divider(
                      height: 1,
                      thickness: 1,
                      indent: 14,
                      endIndent: 14,
                      color: AppColors.borderLight,
                    ),
                  InkWell(
                    onTap: () => onSelect(examples[i]),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 11,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.north_west_rounded,
                            size: 14,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              examples[i],
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 4),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.accent = AppColors.primary,
    this.badge = 0,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color accent;

  /// Count shown in the corner when something is waiting on the user.
  final int badge;

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
                  Container(
                    width: 38,
                    height: 38,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Icon(icon, size: 20, color: accent),
                  ),
                  const Spacer(),
                  if (badge > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(
                          AppColors.pillRadius,
                        ),
                      ),
                      child: Text(
                        '$badge',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    )
                  else
                    const Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: AppColors.textMuted,
                    ),
                ],
              ),
              const SizedBox(height: 12),
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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
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

/// Surfaces tickets the portal has bounced back to the requester —
/// "Needs Your Reply" and "Confirm Fix" — so they are not missed.
class _NeedsActionStrip extends StatelessWidget {
  const _NeedsActionStrip({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.error.withValues(alpha: 0.07),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.error.withValues(alpha: 0.28)),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.notifications_active_outlined,
                size: 18,
                color: AppColors.error,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  count == 1
                      ? '1 request is waiting on you'
                      : '$count requests are waiting on you',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.error,
                  ),
                ),
              ),
              const Text(
                'Review',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.error,
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: AppColors.error,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FaqGroup extends StatelessWidget {
  const _FaqGroup({required this.topic});

  final HelpTopic topic;

  @override
  Widget build(BuildContext context) {
    final articles = articlesForTopic(topic);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(topic.icon, size: 17, color: AppColors.primary),
            const SizedBox(width: 7),
            Text(
              topic.label,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (var i = 0; i < articles.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          FaqExpansionTile(article: articles[i]),
        ],
      ],
    );
  }
}

class _SearchResultTile extends StatelessWidget {
  const _SearchResultTile({required this.article});

  final HelpArticle article;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 2, bottom: 4),
          child: Row(
            children: [
              Icon(article.topic.icon, size: 13, color: AppColors.textMuted),
              const SizedBox(width: 5),
              Text(
                article.topic.label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
        FaqExpansionTile(
          article: article,
          highlight: true,
          initiallyExpanded: false,
        ),
      ],
    );
  }
}

class _StillStuckCard extends StatelessWidget {
  const _StillStuckCard({required this.onContact});

  final VoidCallback onContact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              "Didn't find what you were looking for?",
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(width: 10),
          FilledButton(
            onPressed: onContact,
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 42),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: const Text('Contact'),
          ),
        ],
      ),
    );
  }
}

// ===========================================================================
// Contact Support
// ===========================================================================

class ContactSupportScreen extends StatelessWidget {
  const ContactSupportScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ContactSupportScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Contact Support'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primaryLight, AppColors.primary],
              ),
              borderRadius: BorderRadius.circular(AppColors.cardRadius),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Still need help?',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Our support team is here to assist you.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          HelpNavCard(
            icon: Icons.mail_outline_rounded,
            title: 'Send Us a Message',
            subtitle: 'Open a support request and track the reply',
            onTap: () => SupportMessageFormScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            icon: Icons.phone_outlined,
            title: 'Contact Support',
            subtitle: 'Phone and email for the CARES help desk',
            onTap: () => _showContactDetails(context),
          ),
          const SizedBox(height: 20),
          Text(
            SupportContactInfo.typicalReply,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  void _showContactDetails(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.inputFill,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'CARES Help Desk',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 14),
              _ContactRow(
                icon: Icons.mail_outline_rounded,
                label: 'Email',
                value: SupportContactInfo.email,
                onCopy: () => _copy(ctx, SupportContactInfo.email),
              ),
              const SizedBox(height: 10),
              _ContactRow(
                icon: Icons.phone_outlined,
                label: 'Hotline',
                value: SupportContactInfo.hotline,
                onCopy: () => _copy(ctx, SupportContactInfo.hotline),
              ),
              const SizedBox(height: 10),
              _ContactRow(
                icon: Icons.schedule_rounded,
                label: 'Hours',
                value: SupportContactInfo.hours,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _copy(BuildContext context, String value) {
    Clipboard.setData(ClipboardData(text: value));
    Navigator.of(context).pop();
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Copied "$value"')));
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({
    required this.icon,
    required this.label,
    required this.value,
    this.onCopy,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onCopy;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          if (onCopy != null)
            IconButton(
              onPressed: onCopy,
              icon: const Icon(Icons.copy_rounded, size: 16),
              tooltip: 'Copy',
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}

// ===========================================================================
// Send Us a Message (support request form)
// ===========================================================================

class SupportMessageFormScreen extends ConsumerStatefulWidget {
  const SupportMessageFormScreen({super.key, this.initialType});

  final SupportTicketType? initialType;

  static void open(BuildContext context, {SupportTicketType? initialType}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SupportMessageFormScreen(initialType: initialType),
      ),
    );
  }

  @override
  ConsumerState<SupportMessageFormScreen> createState() =>
      _SupportMessageFormScreenState();
}

class _SupportMessageFormScreenState
    extends ConsumerState<SupportMessageFormScreen> {
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();

  late SupportTicketType? _type = widget.initialType;
  bool _submitting = false;
  bool _showErrors = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  bool get _isFeature => _type == SupportTicketType.featureRequest;

  String? get _typeError =>
      _showErrors && _type == null ? 'Choose what this is about' : null;
  String? get _subjectError =>
      _showErrors && _subjectController.text.trim().isEmpty
      ? 'Add a short subject'
      : null;
  String? get _descriptionError =>
      _showErrors && _descriptionController.text.trim().length < 10
      ? 'Tell us a little more (at least 10 characters)'
      : null;

  bool get _isValid =>
      _type != null &&
      _subjectController.text.trim().isNotEmpty &&
      _descriptionController.text.trim().length >= 10;

  Future<void> _submit() async {
    setState(() => _showErrors = true);
    if (!_isValid) return;

    setState(() => _submitting = true);
    final SupportRequest created;
    try {
      created = await ref
          .read(supportRequestsProvider.notifier)
          .create(
            subject: _subjectController.text.trim(),
            description: _descriptionController.text.trim(),
            type: _type!,
          );
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showSupportSnack(context, describeSupportError(error));
      return;
    }
    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => SupportRequestSubmittedScreen(
          referenceId: created.referenceId,
          subject: created.subject,
          type: created.type,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_isFeature ? 'Suggest a Feature' : 'Send Us a Message'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          Text(
            _isFeature
                ? 'Tell us what would make CARES more useful. Ideas are '
                      'reviewed by the team and tracked in My Support Requests.'
                : 'Describe what happened and our team will follow up by '
                      'email and in My Support Requests.',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),
          HelpFormField(
            label: 'What is this about?',
            errorText: _typeError,
            child: SupportTypeField(
              value: _type,
              enabled: !_submitting,
              onChanged: (value) => setState(() => _type = value),
            ),
          ),
          if (_type == SupportTicketType.bug) ...[
            const SizedBox(height: 12),
            SupportInfoBanner(
              icon: Icons.bug_report_outlined,
              accent: AppColors.accentOrange,
              title: 'Reporting a bug?',
              body:
                  'The bug form asks the right questions and attaches your '
                  'device details, which helps us fix it faster.',
              trailing: TextButton(
                onPressed: _submitting
                    ? null
                    : () => Navigator.of(context).pushReplacement(
                        MaterialPageRoute<void>(
                          builder: (_) => const ReportBugScreen(),
                        ),
                      ),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.accentOrange,
                ),
                child: const Text('Use it'),
              ),
            ),
          ],
          const SizedBox(height: 16),
          HelpFormField(
            label: 'Subject',
            errorText: _subjectError,
            child: TextField(
              controller: _subjectController,
              enabled: !_submitting,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: _isFeature
                    ? 'e.g. Dark mode for night briefings'
                    : 'e.g. Donation receipt not received',
              ),
            ),
          ),
          const SizedBox(height: 16),
          HelpFormField(
            label: _isFeature ? 'Your idea' : 'Description',
            errorText: _descriptionError,
            child: TextField(
              controller: _descriptionController,
              enabled: !_submitting,
              minLines: 4,
              maxLines: 8,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: _isFeature
                    ? 'What would it do, and when would you use it?'
                    : 'Include dates, amounts, event names, or reference '
                          'numbers where you can.',
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Submit Request'),
          ),
        ],
      ),
    );
  }
}

class SupportRequestSubmittedScreen extends StatelessWidget {
  const SupportRequestSubmittedScreen({
    super.key,
    required this.referenceId,
    required this.subject,
    required this.type,
  });

  final String referenceId;
  final String subject;
  final SupportTicketType type;

  bool get _isBug => type == SupportTicketType.bug;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_rounded,
                size: 40,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            _isBug ? 'Bug report filed' : 'Request submitted',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _isBug
                ? 'Thanks for the report. Bugs go straight to the Issue queue '
                      'and are looked at first. We will update you here and by '
                      'email.'
                : "Thanks for reaching out. We've received your request and "
                      'will reply by email, usually within 1 business day.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13.5,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppColors.cardRadius),
              border: Border.all(color: AppColors.borderCard),
            ),
            child: Column(
              children: [
                _SummaryRow(label: 'Tracking no.', value: referenceId),
                const Divider(height: 20, color: AppColors.inputFill),
                _SummaryRow(label: 'Subject', value: subject),
                const Divider(height: 20, color: AppColors.inputFill),
                _SummaryRow(label: 'Type', value: type.label),
                const Divider(height: 20, color: AppColors.inputFill),
                _SummaryRow(
                  label: 'Priority',
                  value: '${type.priority.label} · ${type.priority.caption}',
                ),
                const Divider(height: 20, color: AppColors.inputFill),
                _SummaryRow(
                  label: 'Status',
                  value: SupportRequestStatus.open.label,
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: () => MySupportRequestsScreen.open(context),
            child: const Text('View my support requests'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              foregroundColor: AppColors.textPrimary,
              side: const BorderSide(color: AppColors.borderCard),
            ),
            child: const Text('Back to Help & Support'),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 92,
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}

// ===========================================================================
// My Support Requests
// ===========================================================================

/// Chips on the list — mirrors the portal's status filter, collapsed to what
/// matters to the requester.
enum SupportRequestFilter { all, needsAction, active, closed }

extension SupportRequestFilterMeta on SupportRequestFilter {
  String get label => switch (this) {
    SupportRequestFilter.all => 'All',
    SupportRequestFilter.needsAction => 'Waiting on you',
    SupportRequestFilter.active => 'In progress',
    SupportRequestFilter.closed => 'Resolved',
  };

  bool matches(SupportRequest r) => switch (this) {
    SupportRequestFilter.all => true,
    SupportRequestFilter.needsAction => r.status.needsRequesterAction,
    SupportRequestFilter.active =>
      r.status.isUnresolved && !r.status.needsRequesterAction,
    SupportRequestFilter.closed => !r.status.isUnresolved,
  };
}

class MySupportRequestsScreen extends ConsumerStatefulWidget {
  const MySupportRequestsScreen({
    super.key,
    this.initialFilter = SupportRequestFilter.all,
  });

  final SupportRequestFilter initialFilter;

  static void open(
    BuildContext context, {
    SupportRequestFilter initialFilter = SupportRequestFilter.all,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MySupportRequestsScreen(initialFilter: initialFilter),
      ),
    );
  }

  @override
  ConsumerState<MySupportRequestsScreen> createState() =>
      _MySupportRequestsScreenState();
}

class _MySupportRequestsScreenState
    extends ConsumerState<MySupportRequestsScreen> {
  late SupportRequestFilter _filter = widget.initialFilter;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(supportRequestsProvider);
    final requests = async.value ?? const <SupportRequest>[];
    final summary = SupportRequestSummary.of(requests);
    final visible = requests.where(_filter.matches).toList();
    final refresh = ref.read(supportRequestsProvider.notifier).refresh;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Support Requests'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'New request',
            onPressed: () => SupportMessageFormScreen.open(context),
            icon: const Icon(Icons.edit_outlined),
          ),
        ],
      ),
      body: switch (async) {
        AsyncValue(isLoading: true, hasValue: false) => const Center(
          child: CircularProgressIndicator(),
        ),
        AsyncValue(hasError: true, hasValue: false, :final error) =>
          _buildErrorState(context, error ?? 'Unknown error', refresh),
        _ when requests.isEmpty => RefreshIndicator(
          onRefresh: refresh,
          child: _buildEmptyState(context),
        ),
        _ => RefreshIndicator(
          onRefresh: refresh,
          child: HelpPageBody(
            children: [
              _SummaryStrip(summary: summary),
              const SizedBox(height: 16),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                child: Row(
                  children: [
                    for (final f in SupportRequestFilter.values) ...[
                      SupportChoiceChip(
                        label:
                            f == SupportRequestFilter.needsAction &&
                                summary.needsAction > 0
                            ? '${f.label} · ${summary.needsAction}'
                            : f.label,
                        selected: _filter == f,
                        accent: f == SupportRequestFilter.needsAction
                            ? AppColors.error
                            : AppColors.primary,
                        onTap: () => setState(() => _filter = f),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (visible.isEmpty)
                _buildFilterEmpty()
              else
                for (var i = 0; i < visible.length; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  SupportRequestTile(
                    request: visible[i],
                    onTap: () =>
                        SupportRequestDetailScreen.open(context, visible[i]),
                  ),
                ],
            ],
          ),
        ),
      },
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    Object error,
    Future<void> Function() onRetry,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 36,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            const Text(
              "Couldn't load your requests",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              describeSupportError(error),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterEmpty() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.check_circle_outline_rounded,
            size: 32,
            color: AppColors.textMuted,
          ),
          const SizedBox(height: 8),
          Text(
            switch (_filter) {
              SupportRequestFilter.needsAction => 'Nothing is waiting on you',
              SupportRequestFilter.active => 'No requests in progress',
              SupportRequestFilter.closed => 'No resolved requests yet',
              SupportRequestFilter.all => 'No requests',
            },
            style: const TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => setState(() => _filter = SupportRequestFilter.all),
            child: const Text('Show all requests'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(32),
      children: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 48),
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.inputFill,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.inbox_rounded,
                size: 34,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'No support requests yet',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              "When you send us a message or report a bug, it'll show up here "
              'so you can track the reply.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => SupportMessageFormScreen.open(context),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Send Us a Message'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => ReportBugScreen.open(context),
              icon: const Icon(Icons.bug_report_outlined, size: 18),
              label: const Text('Report a Bug'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.borderCard),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// The portal's summary row (total / open / in progress / resolved), read
/// from the requester's side.
class _SummaryStrip extends StatelessWidget {
  const _SummaryStrip({required this.summary});

  final SupportRequestSummary summary;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Row(
        children: [
          _SummaryCell(label: 'Total', value: summary.total),
          _SummaryDivider(),
          _SummaryCell(
            label: 'Open',
            value: summary.unresolved,
            color: AppColors.accentOrange,
          ),
          _SummaryDivider(),
          _SummaryCell(
            label: 'On you',
            value: summary.needsAction,
            color: summary.needsAction > 0 ? AppColors.error : null,
          ),
          _SummaryDivider(),
          _SummaryCell(
            label: 'Resolved',
            value: summary.resolved,
            color: AppColors.secondary,
          ),
        ],
      ),
    );
  }
}

class _SummaryCell extends StatelessWidget {
  const _SummaryCell({required this.label, required this.value, this.color});

  final String label;
  final int value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: color ?? AppColors.textPrimary,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 30, color: AppColors.borderLight);
}

class SupportRequestDetailScreen extends ConsumerStatefulWidget {
  const SupportRequestDetailScreen({super.key, required this.request});

  /// Snapshot used until the provider has a fresher copy of the same ticket.
  final SupportRequest request;

  static void open(BuildContext context, SupportRequest request) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SupportRequestDetailScreen(request: request),
      ),
    );
  }

  @override
  ConsumerState<SupportRequestDetailScreen> createState() =>
      _SupportRequestDetailScreenState();
}

class _SupportRequestDetailScreenState
    extends ConsumerState<SupportRequestDetailScreen> {
  bool _busy = false;

  SupportRequestsNotifier get _notifier =>
      ref.read(supportRequestsProvider.notifier);

  @override
  Widget build(BuildContext context) {
    // Read the live row so a reply or status change shows the moment it lands.
    final request =
        ref
            .watch(supportRequestsProvider)
            .value
            ?.cast<SupportRequest?>()
            .firstWhere(
              (r) => r!.id == widget.request.id,
              orElse: () => null,
            ) ??
        widget.request;
    final status = request.status;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(request.referenceId),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppColors.cardRadius),
              border: Border.all(color: AppColors.borderCard),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        request.subject,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1.25,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SupportStatusChip(status: status),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    SupportTypeBadge(type: request.type),
                    SupportPriorityBadge(priority: request.priority),
                  ],
                ),
                const SizedBox(height: 12),
                _MetaLine(
                  icon: Icons.support_agent_rounded,
                  text: request.assignee == null
                      ? 'Not yet assigned'
                      : 'Handled by ${request.assignee}',
                ),
                const SizedBox(height: 6),
                _MetaLine(
                  icon: Icons.event_outlined,
                  text: 'Submitted ${request.submittedLabel}',
                ),
                const SizedBox(height: 6),
                _MetaLine(
                  icon: Icons.update_rounded,
                  text: 'Last updated ${request.updatedLabel}',
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SupportInfoBanner(
            icon: switch (status) {
              SupportRequestStatus.open => Icons.inbox_outlined,
              SupportRequestStatus.inProgress => Icons.engineering_outlined,
              SupportRequestStatus.underVerification =>
                Icons.fact_check_outlined,
              SupportRequestStatus.clientFeedback =>
                Icons.mark_chat_unread_outlined,
              SupportRequestStatus.resolved => Icons.verified_rounded,
              SupportRequestStatus.closed => Icons.lock_outline_rounded,
            },
            accent: status.color,
            title: status.label,
            body: status.hint,
          ),
          const SizedBox(height: 20),
          const HelpSectionHeader(
            icon: Icons.description_outlined,
            title: 'Your report',
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderCard),
            ),
            child: Text(
              request.description,
              style: const TextStyle(
                fontSize: 13,
                height: 1.45,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 20),
          HelpSectionHeader(
            icon: Icons.forum_outlined,
            title: 'Conversation',
            subtitle: request.conversation.isEmpty
                ? 'No replies yet — we will post here once it is picked up.'
                : null,
          ),
          const SizedBox(height: 14),
          for (var i = 0; i < request.conversation.length; i++) ...[
            if (i > 0) const SizedBox(height: 14),
            SupportMessageBubble(message: request.conversation[i]),
          ],
          if (request.conversation.isNotEmpty) const SizedBox(height: 20),
          ..._buildActions(context, request),
        ],
      ),
    );
  }

  /// What the requester can do next depends on where the portal left it.
  List<Widget> _buildActions(BuildContext context, SupportRequest request) {
    final id = request.id;
    switch (request.status) {
      case SupportRequestStatus.underVerification:
        return [
          FilledButton.icon(
            onPressed: _busy
                ? null
                : () => _run(() => _notifier.confirmFix(id, fixed: true)),
            icon: const Icon(Icons.check_rounded, size: 18),
            label: const Text("Yes, it's fixed"),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _busy
                ? null
                : () => _compose(
                    title: 'Still not working',
                    hint: 'What is still going wrong?',
                    action: (body) =>
                        _notifier.confirmFix(id, fixed: false, body: body),
                  ),
            icon: const Icon(Icons.replay_rounded, size: 18),
            label: const Text('Still not working'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              foregroundColor: AppColors.textPrimary,
              side: const BorderSide(color: AppColors.borderCard),
            ),
          ),
        ];
      case SupportRequestStatus.clientFeedback:
        return [
          FilledButton.icon(
            onPressed: _busy
                ? null
                : () => _compose(
                    title: 'Reply to support',
                    hint: 'Answer what the team asked for',
                    action: (body) => _notifier.reply(id, body),
                  ),
            icon: const Icon(Icons.reply_rounded, size: 18),
            label: const Text('Reply to support'),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          ),
        ];
      case SupportRequestStatus.resolved:
      case SupportRequestStatus.closed:
        return [
          _ResolvedNote(
            status: request.status,
            onReopen: _busy
                ? null
                : () => _compose(
                    title: 'Reopen request',
                    hint: 'Tell us why this needs another look',
                    action: (body) => _notifier.reopen(id, body),
                  ),
          ),
        ];
      case SupportRequestStatus.open:
      case SupportRequestStatus.inProgress:
        return [
          _ReplyHint(
            onReply: _busy
                ? null
                : () => _compose(
                    title: 'Add a reply',
                    hint: 'Add more detail for the team',
                    action: (body) => _notifier.reply(id, body),
                  ),
          ),
        ];
    }
  }

  /// Collects a message in a bottom sheet, then runs [action] with it.
  Future<void> _compose({
    required String title,
    required String hint,
    required Future<SupportRequest> Function(String body) action,
  }) async {
    final body = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ReplyComposerSheet(title: title, hint: hint),
    );
    if (body == null || !mounted) return;
    await _run(() => action(body));
  }

  Future<void> _run(Future<SupportRequest> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (error) {
      if (mounted) showSupportSnack(context, describeSupportError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

/// Message composer shared by reply, reopen, and "still not working".
class _ReplyComposerSheet extends StatefulWidget {
  const _ReplyComposerSheet({required this.title, required this.hint});

  final String title;
  final String hint;

  @override
  State<_ReplyComposerSheet> createState() => _ReplyComposerSheetState();
}

class _ReplyComposerSheetState extends State<_ReplyComposerSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canSend = _controller.text.trim().isNotEmpty;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            autofocus: true,
            minLines: 3,
            maxLines: 6,
            textCapitalization: TextCapitalization.sentences,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(hintText: widget.hint),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: canSend
                ? () => Navigator.of(context).pop(_controller.text.trim())
                : null,
            icon: const Icon(Icons.send_rounded, size: 18),
            label: const Text('Send'),
          ),
        ],
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 12.5,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }
}

class _ResolvedNote extends StatelessWidget {
  const _ResolvedNote({required this.status, required this.onReopen});

  final SupportRequestStatus status;
  final VoidCallback? onReopen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.secondary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.verified_rounded,
            size: 18,
            color: AppColors.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              status == SupportRequestStatus.closed
                  ? 'This request is closed.'
                  : 'This request is resolved.',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          TextButton(onPressed: onReopen, child: const Text('Reopen')),
        ],
      ),
    );
  }
}

class _ReplyHint extends StatelessWidget {
  const _ReplyHint({required this.onReply});

  final VoidCallback? onReply;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onReply,
      icon: const Icon(Icons.reply_rounded, size: 18),
      label: const Text('Add a reply'),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: AppColors.textPrimary,
        side: const BorderSide(color: AppColors.borderCard),
      ),
    );
  }
}

// ===========================================================================
// Report a Bug
// ===========================================================================

/// Bug-specific intake. Files a `bug` ticket (the portal's high-priority
/// Issue bucket) and gathers the details triage always asks for — where it
/// happened, steps to reproduce, how often, and the device — so the first
/// reply is not "could you tell us more?".
class ReportBugScreen extends ConsumerStatefulWidget {
  const ReportBugScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const ReportBugScreen()));
  }

  @override
  ConsumerState<ReportBugScreen> createState() => _ReportBugScreenState();
}

class _ReportBugScreenState extends ConsumerState<ReportBugScreen> {
  final _titleController = TextEditingController();
  final _happenedController = TextEditingController();
  final _stepsController = TextEditingController();

  BugArea? _area;
  BugFrequency _frequency = BugFrequency.everyTime;
  bool _includeDevice = true;
  bool _submitting = false;
  bool _showErrors = false;

  @override
  void dispose() {
    _titleController.dispose();
    _happenedController.dispose();
    _stepsController.dispose();
    super.dispose();
  }

  String? get _areaError =>
      _showErrors && _area == null ? 'Pick where it happened' : null;
  String? get _titleError => _showErrors && _titleController.text.trim().isEmpty
      ? 'Give the bug a short title'
      : null;
  String? get _happenedError =>
      _showErrors && _happenedController.text.trim().length < 10
      ? 'Describe what went wrong (at least 10 characters)'
      : null;

  bool get _isValid =>
      _area != null &&
      _titleController.text.trim().isNotEmpty &&
      _happenedController.text.trim().length >= 10;

  Future<void> _submit() async {
    setState(() => _showErrors = true);
    if (!_isValid) return;

    setState(() => _submitting = true);
    final SupportRequest created;
    try {
      // The portal ticket has one subject and one description; the area is
      // folded into the subject so it is readable in the queue at a glance,
      // and the reproduction details are laid out as sections in the body.
      created = await ref
          .read(supportRequestsProvider.notifier)
          .create(
            subject: '[${_area!.label}] ${_titleController.text.trim()}',
            description: _composeDescription(),
            type: SupportTicketType.bug,
          );
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showSupportSnack(context, describeSupportError(error));
      return;
    }
    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => SupportRequestSubmittedScreen(
          referenceId: created.referenceId,
          subject: created.subject,
          type: created.type,
        ),
      ),
    );
  }

  String _composeDescription() {
    final steps = _stepsController.text.trim();
    return [
      _happenedController.text.trim(),
      if (steps.isNotEmpty) 'Steps to reproduce:\n$steps',
      'Happens: ${_frequency.label}',
      if (_includeDevice) 'Device: ${BugDeviceInfo.summary}',
    ].join('\n\n');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Report a Bug'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: HelpPageBody(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.accentOrange.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(AppColors.cardRadius),
                border: Border.all(
                  color: AppColors.accentOrange.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.bug_report_outlined,
                    size: 26,
                    color: AppColors.accentOrange,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Found something broken?',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Bug reports go straight to our Issue queue and are '
                          'looked at first. The more you can tell us, the '
                          'faster we can fix it.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            HelpFormField(
              label: 'Where did it happen?',
              errorText: _areaError,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final area in BugArea.values)
                    SupportChoiceChip(
                      label: area.label,
                      icon: area.icon,
                      selected: _area == area,
                      accent: AppColors.accentOrange,
                      onTap: _submitting
                          ? () {}
                          : () => setState(() => _area = area),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            HelpFormField(
              label: 'Short title',
              errorText: _titleError,
              child: TextField(
                controller: _titleController,
                enabled: !_submitting,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'e.g. App closes when opening the Events tab',
                ),
              ),
            ),
            const SizedBox(height: 16),
            HelpFormField(
              label: 'What happened?',
              errorText: _happenedError,
              child: TextField(
                controller: _happenedController,
                enabled: !_submitting,
                minLines: 3,
                maxLines: 6,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText:
                      'What did you expect, and what did you see instead? '
                      'Copy any error message you saw.',
                ),
              ),
            ),
            const SizedBox(height: 16),
            HelpFormField(
              label: 'Steps to reproduce (optional)',
              child: TextField(
                controller: _stepsController,
                enabled: !_submitting,
                minLines: 3,
                maxLines: 6,
                decoration: const InputDecoration(
                  hintText: '1. Open the app\n2. Tap Events\n3. App closes',
                ),
              ),
            ),
            const SizedBox(height: 16),
            HelpFormField(
              label: 'How often does it happen?',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final f in BugFrequency.values)
                    SupportChoiceChip(
                      label: f.label,
                      selected: _frequency == f,
                      accent: AppColors.accentOrange,
                      onTap: _submitting
                          ? () {}
                          : () => setState(() => _frequency = f),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _DeviceInfoCard(
              included: _includeDevice,
              onChanged: _submitting
                  ? null
                  : (v) => setState(() => _includeDevice = v),
            ),
            const SizedBox(height: 12),
            const Text(
              'Your name, email, and role are attached automatically so the '
              'team can reply to you.',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textMuted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accentOrange,
              ),
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.bug_report_outlined, size: 18),
              label: Text(_submitting ? 'Sending…' : 'Submit Bug Report'),
            ),
          ],
        ),
      ),
    );
  }
}

/// The device details a real report would attach; the toggle lets the user
/// opt out, since some would rather not share the model.
class _DeviceInfoCard extends StatelessWidget {
  const _DeviceInfoCard({required this.included, required this.onChanged});

  final bool included;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.phone_android_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Include device details',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  BugDeviceInfo.summary,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: included,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}

// ===========================================================================
// Report a Problem
// ===========================================================================

class ReportProblemScreen extends StatelessWidget {
  const ReportProblemScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ReportProblemScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Report a Problem'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(AppColors.cardRadius),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.report_gmailerrorred_rounded,
                  size: 24,
                  color: AppColors.error,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'See something wrong?',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Help us keep the community safe by reporting '
                        'suspicious or inappropriate activity.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          for (var i = 0; i < ReportReason.values.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            HelpNavCard(
              icon: ReportReason.values[i].icon,
              title: ReportReason.values[i].label,
              subtitle: ReportReason.values[i].hint,
              accent: AppColors.error,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      ReportFormScreen(reason: ReportReason.values[i]),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class ReportFormScreen extends ConsumerStatefulWidget {
  const ReportFormScreen({super.key, required this.reason});

  final ReportReason reason;

  @override
  ConsumerState<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends ConsumerState<ReportFormScreen> {
  final _detailsController = TextEditingController();

  late ReportReason _reason = widget.reason;
  bool _submitting = false;
  bool _showErrors = false;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  String? get _detailsError =>
      _showErrors && _detailsController.text.trim().length < 10
      ? 'Please add a few details so we can investigate'
      : null;

  Future<void> _submit() async {
    setState(() => _showErrors = true);
    if (_detailsController.text.trim().length < 10) return;

    setState(() => _submitting = true);
    final SupportRequest created;
    try {
      // Filed as a `report` ticket so the portal can triage it apart from
      // help requests; the reason becomes the subject.
      created = await ref
          .read(supportRequestsProvider.notifier)
          .create(
            subject: _reason.label,
            description: _detailsController.text.trim(),
            type: SupportTicketType.report,
          );
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showSupportSnack(context, describeSupportError(error));
      return;
    }
    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => ReportSubmittedScreen(referenceId: created.referenceId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Report a Problem'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          HelpFormField(
            label: 'What are you reporting?',
            child: DropdownButtonFormField<ReportReason>(
              initialValue: _reason,
              isExpanded: true,
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
              ),
              items: [
                for (final r in ReportReason.values)
                  DropdownMenuItem(value: r, child: Text(r.label)),
              ],
              onChanged: _submitting
                  ? null
                  : (value) => setState(() => _reason = value ?? _reason),
            ),
          ),
          const SizedBox(height: 16),
          HelpFormField(
            label: 'Details',
            errorText: _detailsError,
            child: TextField(
              controller: _detailsController,
              enabled: !_submitting,
              minLines: 4,
              maxLines: 8,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(hintText: _reason.hint),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Reports are confidential. Our Trust & Safety team reviews every '
            'submission.',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Submit Report'),
          ),
        ],
      ),
    );
  }
}

class ReportSubmittedScreen extends StatelessWidget {
  const ReportSubmittedScreen({super.key, required this.referenceId});

  final String referenceId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.shield_outlined,
                size: 38,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Report received',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Thank you for helping keep CARES safe. Our Trust & Safety team '
            'will review your report and may follow up if they need more '
            'information. Track it as $referenceId in My Support Requests.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13.5,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
            child: const Text('Back to Help & Support'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => MySupportRequestsScreen.open(context),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.textPrimary,
              side: const BorderSide(color: AppColors.borderCard),
            ),
            child: const Text('View My Support Requests'),
          ),
        ],
      ),
    );
  }
}
