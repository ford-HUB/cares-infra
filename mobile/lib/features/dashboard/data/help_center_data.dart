import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Static content model for the Help & Support center.
///
/// Everything in this file is mock/sample data for the prototype — no network
/// calls, no persistence. Screens read from these constants directly.

/// Top-level help categories surfaced in Quick Help and the FAQ list.
enum HelpTopic { donations, events, account, payments }

extension HelpTopicMeta on HelpTopic {
  String get label => switch (this) {
    HelpTopic.donations => 'Donations',
    HelpTopic.events => 'Events',
    HelpTopic.account => 'Account & Profile',
    HelpTopic.payments => 'Payments',
  };

  /// Shorter label for compact chips / cards.
  String get shortLabel => switch (this) {
    HelpTopic.donations => 'Donations',
    HelpTopic.events => 'Events',
    HelpTopic.account => 'Account',
    HelpTopic.payments => 'Payments',
  };

  String get emoji => switch (this) {
    HelpTopic.donations => '💰',
    HelpTopic.events => '📅',
    HelpTopic.account => '👤',
    HelpTopic.payments => '💳',
  };

  IconData get icon => switch (this) {
    HelpTopic.donations => Icons.volunteer_activism_outlined,
    HelpTopic.events => Icons.event_available_outlined,
    HelpTopic.account => Icons.person_outline_rounded,
    HelpTopic.payments => Icons.credit_card_outlined,
  };

  String get blurb => switch (this) {
    HelpTopic.donations => 'Giving, receipts, and refunds',
    HelpTopic.events => 'Registering, cancelling, and reminders',
    HelpTopic.account => 'Profile, password, and login details',
    HelpTopic.payments => 'Failed charges and payment methods',
  };
}

/// A single expandable FAQ entry.
class HelpArticle {
  const HelpArticle({
    required this.id,
    required this.topic,
    required this.question,
    required this.answer,
  });

  final String id;
  final HelpTopic topic;
  final String question;
  final String answer;
}

/// The three categories shown as prominent Quick Help cards.
const kQuickHelpTopics = <HelpTopic>[
  HelpTopic.donations,
  HelpTopic.events,
  HelpTopic.account,
];

const kExampleSearches = <String>[
  'How do I donate?',
  'How do I join an event?',
  'How can I cancel my donation?',
  "I didn't receive a confirmation.",
  'How do I edit my profile?',
];

const kHelpArticles = <HelpArticle>[
  // ---------------------------------------------------------------- Donations
  HelpArticle(
    id: 'don-make',
    topic: HelpTopic.donations,
    question: 'How do I make a donation?',
    answer:
        'Open the Donate tab, choose a campaign or the CARES general fund, tap '
        'Donate, then enter an amount and confirm. Your gift is recorded '
        'instantly and appears in your donation history.',
  ),
  HelpArticle(
    id: 'don-methods',
    topic: HelpTopic.donations,
    question: 'What payment methods are accepted?',
    answer:
        'You can give with GCash, Maya, credit or debit card (Visa and '
        'Mastercard), and over-the-counter bank transfer. Available options are '
        'shown on the payment step before you confirm.',
  ),
  HelpArticle(
    id: 'don-anon',
    topic: HelpTopic.donations,
    question: 'Can I donate anonymously?',
    answer:
        'Yes. Toggle "Give anonymously" on the confirmation screen and your '
        'name will be hidden from public donor lists and the campaign '
        'organizer. Your receipt is still issued to your account.',
  ),
  HelpArticle(
    id: 'don-refund',
    topic: HelpTopic.donations,
    question: 'Can I cancel or request a refund?',
    answer:
        'Donations can be cancelled within 24 hours if the funds have not yet '
        'been released to the campaign. Go to Donation history, open the '
        'donation, and tap Request refund. Approved refunds return to your '
        'original payment method within 5–10 business days.',
  ),
  HelpArticle(
    id: 'don-history',
    topic: HelpTopic.donations,
    question: 'Where can I see my donation history?',
    answer:
        'Go to Profile → Donation history (or the History card on your '
        'dashboard). Each entry shows the campaign, amount, date, and receipt '
        'status. You can filter by month or campaign.',
  ),
  HelpArticle(
    id: 'don-receipt',
    topic: HelpTopic.donations,
    question: 'Will I receive a donation receipt?',
    answer:
        'An official receipt is generated automatically once your payment '
        'clears, usually within a few minutes. Find it under the donation '
        'detail screen and tap Download receipt to save a PDF copy.',
  ),
  // ------------------------------------------------------------------- Events
  HelpArticle(
    id: 'evt-register',
    topic: HelpTopic.events,
    question: 'How do I register for an event?',
    answer:
        'Open the Events tab, tap an event to view its details, then tap Join '
        'Event and confirm. You will see a "Registered" badge and the event '
        'moves into your upcoming events list.',
  ),
  HelpArticle(
    id: 'evt-cancel',
    topic: HelpTopic.events,
    question: 'How do I cancel my event registration?',
    answer:
        'Open the event from your upcoming events and tap Cancel registration. '
        'Please cancel at least 24 hours before the start time so your slot can '
        'be offered to another volunteer.',
  ),
  HelpArticle(
    id: 'evt-upcoming',
    topic: HelpTopic.events,
    question: 'How can I see my upcoming events?',
    answer:
        'Your registered events appear on the Activity tab and on the Home '
        'dashboard under "Upcoming". Each card shows the date, venue, and a '
        'countdown to the event.',
  ),
  HelpArticle(
    id: 'evt-cancelled',
    topic: HelpTopic.events,
    question: 'What happens if an event is cancelled?',
    answer:
        'If an organizer cancels an event, you receive a notification and the '
        'event is marked Cancelled in your list. No attendance is recorded and '
        'any required materials fee tied to it is reversed automatically.',
  ),
  HelpArticle(
    id: 'evt-create',
    topic: HelpTopic.events,
    question: 'Can I create my own event?',
    answer:
        'Volunteer accounts can join events. To host one, request organizer '
        'access from a partner organization — once approved, a Create Event '
        'option appears in the Events tab.',
  ),
  // ----------------------------------------------------------- Account & Profile
  HelpArticle(
    id: 'acc-edit',
    topic: HelpTopic.account,
    question: 'How do I edit my profile?',
    answer:
        'Go to Profile → Edit Profile. You can update your name, photo, bio, '
        'skills, and availability. Tap Save to apply your changes.',
  ),
  HelpArticle(
    id: 'acc-password',
    topic: HelpTopic.account,
    question: 'How do I change my password?',
    answer:
        'Go to Profile → Account → Change password. Enter your current '
        'password, then your new password twice. You will stay signed in on '
        'this device after the change.',
  ),
  HelpArticle(
    id: 'acc-contact',
    topic: HelpTopic.account,
    question: 'How do I change my email or phone number?',
    answer:
        'Open Profile → Edit Profile → Contact details. New email addresses and '
        'phone numbers require a one-time verification code before they become '
        'active on your account.',
  ),
  HelpArticle(
    id: 'acc-delete',
    topic: HelpTopic.account,
    question: 'How do I delete my account?',
    answer:
        'Go to Profile → Account → Delete account. You will be asked to '
        'confirm. Donation records are retained for legal and receipting '
        'purposes, but your profile and personal details are permanently '
        'removed after a 14-day grace period.',
  ),
  // ----------------------------------------------------------------- Payments
  HelpArticle(
    id: 'pay-failed',
    topic: HelpTopic.payments,
    question: 'My payment failed. What should I do?',
    answer:
        'First check that your card or e-wallet has sufficient funds and that '
        'your details are correct, then try again. If it keeps failing, switch '
        'to another payment method. Failed attempts are never charged.',
  ),
  HelpArticle(
    id: 'pay-missing',
    topic: HelpTopic.payments,
    question: "I was charged but my donation didn't appear.",
    answer:
        'Bank confirmations can lag by a few minutes. If the donation is still '
        'missing after an hour, open Contact Support → Send Us a Message with '
        'the date, amount, and reference number so we can trace the payment.',
  ),
  HelpArticle(
    id: 'pay-update',
    topic: HelpTopic.payments,
    question: 'How do I update my payment method?',
    answer:
        'Saved payment methods live under Profile → Account → Payment methods. '
        'Add a new card or e-wallet there and set it as default, or remove one '
        'you no longer use.',
  ),
];

List<HelpArticle> articlesForTopic(HelpTopic topic) =>
    kHelpArticles.where((a) => a.topic == topic).toList(growable: false);

/// Lightweight keyword ranking so the search bar feels responsive on static
/// content. Returns articles ordered by how well they match [query].
List<HelpArticle> searchHelpArticles(String query) {
  final terms = query
      .toLowerCase()
      .split(RegExp(r'[^a-z0-9]+'))
      .where((t) => t.length > 1)
      .toList();
  if (terms.isEmpty) return const [];

  final scored = <({HelpArticle article, int score})>[];
  for (final article in kHelpArticles) {
    final question = article.question.toLowerCase();
    final answer = article.answer.toLowerCase();
    var score = 0;
    for (final term in terms) {
      if (question.contains(term)) score += 3;
      if (answer.contains(term)) score += 1;
      if (article.topic.label.toLowerCase().contains(term)) score += 2;
    }
    if (score > 0) scored.add((article: article, score: score));
  }
  scored.sort((a, b) => b.score.compareTo(a.score));
  return scored.map((s) => s.article).toList(growable: false);
}

// ---------------------------------------------------------------------------
// Support requests (static samples)
// ---------------------------------------------------------------------------

enum SupportRequestStatus { open, inProgress, resolved }

extension SupportRequestStatusMeta on SupportRequestStatus {
  String get label => switch (this) {
    SupportRequestStatus.open => 'Open',
    SupportRequestStatus.inProgress => 'In Progress',
    SupportRequestStatus.resolved => 'Resolved',
  };

  Color get color => switch (this) {
    SupportRequestStatus.open => AppColors.accentOrange,
    SupportRequestStatus.inProgress => AppColors.primary,
    SupportRequestStatus.resolved => AppColors.secondary,
  };
}

enum SupportCategory { donation, event, account, payment, other }

extension SupportCategoryMeta on SupportCategory {
  String get label => switch (this) {
    SupportCategory.donation => 'Donation',
    SupportCategory.event => 'Event',
    SupportCategory.account => 'Account',
    SupportCategory.payment => 'Payment',
    SupportCategory.other => 'Other',
  };
}

enum SupportAuthor { you, agent }

class SupportMessage {
  const SupportMessage({
    required this.author,
    required this.body,
    required this.timeLabel,
  });

  final SupportAuthor author;
  final String body;
  final String timeLabel;
}

class SupportRequestSample {
  const SupportRequestSample({
    required this.referenceId,
    required this.subject,
    required this.category,
    required this.status,
    required this.submittedLabel,
    required this.updatedLabel,
    required this.conversation,
  });

  final String referenceId;
  final String subject;
  final SupportCategory category;
  final SupportRequestStatus status;
  final String submittedLabel;
  final String updatedLabel;
  final List<SupportMessage> conversation;
}

const kSampleSupportRequests = <SupportRequestSample>[
  SupportRequestSample(
    referenceId: 'REQ #0005',
    subject: 'Payment issue',
    category: SupportCategory.payment,
    status: SupportRequestStatus.inProgress,
    submittedLabel: 'Aug 28, 2026',
    updatedLabel: 'Aug 30, 2026',
    conversation: [
      SupportMessage(
        author: SupportAuthor.you,
        body:
            'I donated ₱500 to the CARES Health Fund this morning with GCash. '
            'The money left my wallet but the donation is not showing in my '
            'history. Reference number 8827345190.',
        timeLabel: 'Aug 28 · 9:14 AM',
      ),
      SupportMessage(
        author: SupportAuthor.agent,
        body:
            'Thanks for the details and the reference number. We have located '
            'the payment and are confirming it with the provider. This usually '
            'takes 1–2 business days.',
        timeLabel: 'Aug 28 · 2:40 PM',
      ),
      SupportMessage(
        author: SupportAuthor.agent,
        body:
            'Quick update: the provider confirmed the transfer. We are posting '
            'the donation to your account now and will close this request once '
            'you can see it.',
        timeLabel: 'Aug 30 · 10:02 AM',
      ),
    ],
  ),
  SupportRequestSample(
    referenceId: 'REQ #0002',
    subject: 'Event registration issue',
    category: SupportCategory.event,
    status: SupportRequestStatus.resolved,
    submittedLabel: 'Aug 12, 2026',
    updatedLabel: 'Aug 14, 2026',
    conversation: [
      SupportMessage(
        author: SupportAuthor.you,
        body:
            'I tried to join the Coastal Cleanup Drive but I keep getting a '
            '"slot unavailable" error even though it says 8 slots are left.',
        timeLabel: 'Aug 12 · 6:31 PM',
      ),
      SupportMessage(
        author: SupportAuthor.agent,
        body:
            'Sorry about that. There was a sync delay on that event\'s slot '
            'count. We have cleared it and manually added you to the roster — '
            'you should see the Registered badge now.',
        timeLabel: 'Aug 13 · 11:15 AM',
      ),
      SupportMessage(
        author: SupportAuthor.you,
        body: 'Confirmed, it shows Registered now. Thank you!',
        timeLabel: 'Aug 14 · 8:03 AM',
      ),
      SupportMessage(
        author: SupportAuthor.agent,
        body: 'Great — marking this as resolved. Enjoy the cleanup drive!',
        timeLabel: 'Aug 14 · 8:20 AM',
      ),
    ],
  ),
];

// ---------------------------------------------------------------------------
// Report a Problem (static options)
// ---------------------------------------------------------------------------

enum ReportReason {
  donationCampaign,
  event,
  user,
  inappropriateContent,
  suspiciousActivity,
}

extension ReportReasonMeta on ReportReason {
  String get label => switch (this) {
    ReportReason.donationCampaign => 'Report a donation campaign',
    ReportReason.event => 'Report an event',
    ReportReason.user => 'Report a user',
    ReportReason.inappropriateContent => 'Report inappropriate content',
    ReportReason.suspiciousActivity => 'Report suspicious activity',
  };

  String get hint => switch (this) {
    ReportReason.donationCampaign =>
      'Campaign name or link, and what looks wrong about it',
    ReportReason.event => 'Event name or link, and what looks wrong about it',
    ReportReason.user => 'Username or profile link, and what they did',
    ReportReason.inappropriateContent =>
      'Where you saw the content and why it is inappropriate',
    ReportReason.suspiciousActivity => 'What you noticed and where',
  };

  IconData get icon => switch (this) {
    ReportReason.donationCampaign => Icons.campaign_outlined,
    ReportReason.event => Icons.event_busy_outlined,
    ReportReason.user => Icons.person_off_outlined,
    ReportReason.inappropriateContent => Icons.report_gmailerrorred_outlined,
    ReportReason.suspiciousActivity => Icons.gpp_maybe_outlined,
  };
}

/// Static support-desk contact details shown on the Contact Support screen.
class SupportContactInfo {
  const SupportContactInfo._();

  static const email = 'support@cares.org';
  static const hotline = '(032) 123-4567';
  static const hours = 'Mon–Sat, 8:00 AM – 6:00 PM PHT';
  static const typicalReply = 'Typical reply within 1 business day';
}
