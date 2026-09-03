import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../data/help_center_data.dart';
import '../widgets/help_support_widgets.dart';

/// Help & Support center — a fully static/front-end feature. No network calls,
/// no persistence: forms simulate submission and surface confirmation UI only.
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

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  final _faqSectionKey = GlobalKey();

  String _query = '';
  HelpTopic? _focusedTopic;

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  bool get _isSearching => _query.trim().isNotEmpty;

  void _runSearch(String value) => setState(() => _query = value);

  void _clearSearch() {
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() => _query = '');
  }

  void _applyExample(String example) {
    _searchController.text = example;
    _searchController.selection = TextSelection.collapsed(
      offset: example.length,
    );
    setState(() => _query = example);
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
        HelpSearchField(
          controller: _searchController,
          focusNode: _searchFocusNode,
          onChanged: _runSearch,
          onClear: _clearSearch,
        ),
        if (!_isSearching) ...[
          const SizedBox(height: 14),
          const Text(
            'Try searching for:',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final example in kExampleSearches)
                HelpExampleChip(
                  label: example,
                  onTap: () => _applyExample(example),
                ),
            ],
          ),
        ],
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

  // ----------------------------------------------------------- Quick Help
  Widget _buildQuickHelp() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const HelpSectionHeader(
          emoji: '📚',
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
          emoji: '',
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
            emoji: '🆘',
            title: 'Need More Help?',
            subtitle:
                "Can't find your answer above? These options are here for "
                'you.',
          ),
          const SizedBox(height: 14),
          HelpNavCard(
            emoji: '💬',
            title: 'Contact Support',
            subtitle: 'Chat, send a message, or reach us by phone',
            onTap: () => ContactSupportScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            emoji: '📩',
            title: 'My Support Requests',
            subtitle: 'Track your previous requests and replies',
            onTap: () => MySupportRequestsScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            emoji: '🚨',
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
            Text(topic.emoji, style: const TextStyle(fontSize: 15)),
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
          child: Text(
            '${article.topic.emoji}  ${article.topic.label}',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
            ),
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
            emoji: '💬',
            title: 'Chat with Support',
            subtitle: 'Live chat · typically replies in a few minutes',
            onTap: () => SupportChatScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            emoji: '✉️',
            title: 'Send Us a Message',
            subtitle: 'Open a support request and track the reply',
            onTap: () => SupportMessageFormScreen.open(context),
          ),
          const SizedBox(height: 10),
          HelpNavCard(
            emoji: '📞',
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
// Chat with Support (static mock)
// ===========================================================================

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const SupportChatScreen()));
  }

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _messages = <SupportMessage>[
    const SupportMessage(
      author: SupportAuthor.agent,
      body:
          "Hi! You're chatting with the CARES support team. How can we help "
          'you today?',
      timeLabel: 'Now',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add(
        SupportMessage(author: SupportAuthor.you, body: text, timeLabel: 'Now'),
      );
      _messages.add(
        const SupportMessage(
          author: SupportAuthor.agent,
          body:
              "Thanks for the details — a support specialist will pick this up "
              'shortly. This chat is a preview, so replies here are simulated.',
          timeLabel: 'Now',
        ),
      );
    });
    _controller.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Chat with Support'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.separated(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              itemCount: _messages.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
              itemBuilder: (_, i) =>
                  SupportMessageBubble(message: _messages[i]),
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.borderCard)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'Type a message...',
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _send,
                    icon: const Icon(Icons.send_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
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

// ===========================================================================
// Send Us a Message (support request form)
// ===========================================================================

class SupportMessageFormScreen extends StatefulWidget {
  const SupportMessageFormScreen({super.key, this.initialCategory});

  final SupportCategory? initialCategory;

  static void open(BuildContext context, {SupportCategory? initialCategory}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            SupportMessageFormScreen(initialCategory: initialCategory),
      ),
    );
  }

  @override
  State<SupportMessageFormScreen> createState() =>
      _SupportMessageFormScreenState();
}

class _SupportMessageFormScreenState extends State<SupportMessageFormScreen> {
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();

  late SupportCategory? _category = widget.initialCategory;
  String? _attachmentName;
  bool _submitting = false;
  bool _showErrors = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  String? get _categoryError =>
      _showErrors && _category == null ? 'Choose a category' : null;
  String? get _subjectError =>
      _showErrors && _subjectController.text.trim().isEmpty
      ? 'Add a short subject'
      : null;
  String? get _descriptionError =>
      _showErrors && _descriptionController.text.trim().length < 10
      ? 'Tell us a little more (at least 10 characters)'
      : null;

  bool get _isValid =>
      _category != null &&
      _subjectController.text.trim().isNotEmpty &&
      _descriptionController.text.trim().length >= 10;

  Future<void> _submit() async {
    setState(() => _showErrors = true);
    if (!_isValid) return;

    setState(() => _submitting = true);
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    setState(() => _submitting = false);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => SupportRequestSubmittedScreen(
          referenceId: 'REQ #0006',
          subject: _subjectController.text.trim(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Send Us a Message'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: HelpPageBody(
        children: [
          const Text(
            'Describe what happened and our team will follow up by email and '
            'in My Support Requests.',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),
          HelpFormField(
            label: 'Category',
            errorText: _categoryError,
            child: DropdownButtonFormField<SupportCategory>(
              initialValue: _category,
              isExpanded: true,
              decoration: const InputDecoration(
                hintText: 'Select a category',
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
              ),
              items: [
                for (final c in SupportCategory.values)
                  DropdownMenuItem(value: c, child: Text(c.label)),
              ],
              onChanged: _submitting
                  ? null
                  : (value) => setState(() => _category = value),
            ),
          ),
          const SizedBox(height: 16),
          HelpFormField(
            label: 'Subject',
            errorText: _subjectError,
            child: TextField(
              controller: _subjectController,
              enabled: !_submitting,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'e.g. Donation receipt not received',
              ),
            ),
          ),
          const SizedBox(height: 16),
          HelpFormField(
            label: 'Description',
            errorText: _descriptionError,
            child: TextField(
              controller: _descriptionController,
              enabled: !_submitting,
              minLines: 4,
              maxLines: 8,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText:
                    'Include dates, amounts, event names, or reference '
                    'numbers where you can.',
              ),
            ),
          ),
          const SizedBox(height: 16),
          HelpFormField(
            label: 'Attachment',
            child: MockAttachmentField(
              fileName: _attachmentName,
              onAttach: () =>
                  setState(() => _attachmentName = 'screenshot_2026-08-31.png'),
              onRemove: () => setState(() => _attachmentName = null),
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
  });

  final String referenceId;
  final String subject;

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
          const Text(
            'Request submitted',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            "Thanks for reaching out. We've received your request and will "
            'reply by email, usually within 1 business day.',
            textAlign: TextAlign.center,
            style: TextStyle(
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
                _SummaryRow(label: 'Request ID', value: referenceId),
                const Divider(height: 20, color: AppColors.inputFill),
                _SummaryRow(label: 'Subject', value: subject),
                const Divider(height: 20, color: AppColors.inputFill),
                const _SummaryRow(label: 'Status', value: 'Open'),
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

class MySupportRequestsScreen extends StatelessWidget {
  const MySupportRequestsScreen({
    super.key,
    this.requests = kSampleSupportRequests,
  });

  final List<SupportRequestSample> requests;

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const MySupportRequestsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Support Requests'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: requests.isEmpty
          ? _buildEmptyState(context)
          : HelpPageBody(
              children: [
                const Text(
                  'Tap a request to see its full conversation and status.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),
                for (var i = 0; i < requests.length; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  SupportRequestTile(
                    request: requests[i],
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            SupportRequestDetailScreen(request: requests[i]),
                      ),
                    ),
                  ),
                ],
              ],
            ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
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
              "When you send us a message, it'll show up here so you can track "
              'the reply.',
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
          ],
        ),
      ),
    );
  }
}

class SupportRequestDetailScreen extends StatelessWidget {
  const SupportRequestDetailScreen({super.key, required this.request});

  final SupportRequestSample request;

  @override
  Widget build(BuildContext context) {
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
                  children: [
                    Expanded(
                      child: Text(
                        request.subject,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SupportStatusChip(status: request.status),
                  ],
                ),
                const SizedBox(height: 12),
                _MetaLine(
                  icon: Icons.tag_rounded,
                  text:
                      '${request.referenceId} · ${request.category.label} issue',
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
          const SizedBox(height: 20),
          const HelpSectionHeader(emoji: '💬', title: 'Conversation'),
          const SizedBox(height: 14),
          for (var i = 0; i < request.conversation.length; i++) ...[
            if (i > 0) const SizedBox(height: 14),
            SupportMessageBubble(message: request.conversation[i]),
          ],
          const SizedBox(height: 20),
          if (request.status == SupportRequestStatus.resolved)
            _ResolvedNote(
              onReopen: () => _mockAction(
                context,
                'Request reopened. Our team will take another look.',
              ),
            )
          else
            _ReplyHint(
              onReply: () => _mockAction(
                context,
                'Reply sent. This is a static preview, so no message was delivered.',
              ),
            ),
        ],
      ),
    );
  }

  void _mockAction(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
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
  const _ResolvedNote({required this.onReopen});

  final VoidCallback onReopen;

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
          const Expanded(
            child: Text(
              'This request is resolved.',
              style: TextStyle(
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

  final VoidCallback onReply;

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
                const Text('🚨', style: TextStyle(fontSize: 20)),
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

class ReportFormScreen extends StatefulWidget {
  const ReportFormScreen({super.key, required this.reason});

  final ReportReason reason;

  @override
  State<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends State<ReportFormScreen> {
  final _detailsController = TextEditingController();

  late ReportReason _reason = widget.reason;
  String? _attachmentName;
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
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    setState(() => _submitting = false);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const ReportSubmittedScreen()),
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
          const SizedBox(height: 16),
          HelpFormField(
            label: 'Attachment',
            child: MockAttachmentField(
              fileName: _attachmentName,
              onAttach: () =>
                  setState(() => _attachmentName = 'evidence_2026-08-31.png'),
              onRemove: () => setState(() => _attachmentName = null),
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
  const ReportSubmittedScreen({super.key});

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
          const Text(
            'Thank you for helping keep CARES safe. Our Trust & Safety team '
            'will review your report and may follow up if they need more '
            'information.',
            textAlign: TextAlign.center,
            style: TextStyle(
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
        ],
      ),
    );
  }
}
