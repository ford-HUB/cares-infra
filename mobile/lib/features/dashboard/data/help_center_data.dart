import 'dart:io';

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
        'and interests. Tap Save to apply your changes.',
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
// Support requests
//
// Mirrors the portal's support-ticket model (site/src/types/support-ticket.ts)
// so what a volunteer sees here lines up with what the admin queue shows:
// the same six statuses, the same ticket types, and the same
// Issue / Support / Feature priority buckets. Rows come from
// `support_ticket_service.dart`; the enums here are the wire vocabulary.
// ---------------------------------------------------------------------------

/// The portal's ticket workflow, in order.
enum SupportRequestStatus {
  open,
  inProgress,

  /// Fix is in — waiting for the requester to confirm it works on their side.
  underVerification,

  /// Blocked on the requester: more detail or a decision is needed from them.
  clientFeedback,
  resolved,
  closed,
}

extension SupportRequestStatusMeta on SupportRequestStatus {
  String get label => switch (this) {
    SupportRequestStatus.open => 'Open',
    SupportRequestStatus.inProgress => 'In Progress',
    SupportRequestStatus.underVerification => 'Confirm Fix',
    SupportRequestStatus.clientFeedback => 'Needs Your Reply',
    SupportRequestStatus.resolved => 'Resolved',
    SupportRequestStatus.closed => 'Closed',
  };

  /// What the status means from the requester's side — the portal's status
  /// hints, reworded for the person who filed the ticket.
  String get hint => switch (this) {
    SupportRequestStatus.open =>
      'Received. Our team has not picked this up yet.',
    SupportRequestStatus.inProgress => 'Someone on our team is working on it.',
    SupportRequestStatus.underVerification =>
      'We believe this is fixed. Please check and let us know.',
    SupportRequestStatus.clientFeedback =>
      'We need more information from you before we can continue.',
    SupportRequestStatus.resolved =>
      'Confirmed fixed. Thanks for your patience.',
    SupportRequestStatus.closed => 'Finished — no further action needed.',
  };

  Color get color => switch (this) {
    SupportRequestStatus.open => AppColors.accentOrange,
    SupportRequestStatus.inProgress => AppColors.primary,
    SupportRequestStatus.underVerification => AppColors.warning,
    SupportRequestStatus.clientFeedback => AppColors.error,
    SupportRequestStatus.resolved => AppColors.secondary,
    SupportRequestStatus.closed => AppColors.textMuted,
  };

  /// The ball is in the requester's court.
  bool get needsRequesterAction =>
      this == SupportRequestStatus.underVerification ||
      this == SupportRequestStatus.clientFeedback;

  /// Still counts against the queue — anything not resolved or closed.
  bool get isUnresolved =>
      this != SupportRequestStatus.resolved &&
      this != SupportRequestStatus.closed;
}

/// What the reporter says went wrong — the portal routes triage by this.
enum SupportTicketType {
  bug,
  login,
  account,
  verification,
  event,
  mobileApp,
  featureRequest,

  /// Flagging another user, event, campaign, or content — the "Report a
  /// Problem" flow, as opposed to a request about the reporter's own account.
  report,
  other,
}

/// The portal triages by three buckets. Priority and category are the same
/// axis there: an Issue is by definition high priority, a Feature low.
enum SupportPriority { issue, support, feature }

extension SupportPriorityMeta on SupportPriority {
  String get label => switch (this) {
    SupportPriority.issue => 'Issue',
    SupportPriority.support => 'Support',
    SupportPriority.feature => 'Feature',
  };

  String get caption => switch (this) {
    SupportPriority.issue => 'High priority — broken or blocking',
    SupportPriority.support => 'Medium priority — help requests',
    SupportPriority.feature => 'Low priority — improvement ideas',
  };

  Color get color => switch (this) {
    SupportPriority.issue => AppColors.error,
    SupportPriority.support => AppColors.primary,
    SupportPriority.feature => AppColors.accent,
  };
}

extension SupportTicketTypeMeta on SupportTicketType {
  String get label => switch (this) {
    SupportTicketType.bug => 'Bug',
    SupportTicketType.login => 'Login Issue',
    SupportTicketType.account => 'Account',
    SupportTicketType.verification => 'Verification',
    SupportTicketType.event => 'Event',
    SupportTicketType.mobileApp => 'Mobile App',
    SupportTicketType.featureRequest => 'Feature Request',
    SupportTicketType.report => 'Report',
    SupportTicketType.other => 'Other',
  };

  String get hint => switch (this) {
    SupportTicketType.bug => 'Something is broken or behaving wrongly',
    SupportTicketType.login => "Can't sign in, password or OTP problems",
    SupportTicketType.account => 'Profile details, email, or deactivation',
    SupportTicketType.verification => 'ID or face scan not going through',
    SupportTicketType.event => 'Registration, slots, or attendance',
    SupportTicketType.mobileApp => 'Crashes, slowness, or display problems',
    SupportTicketType.featureRequest => 'An idea to make CARES better',
    SupportTicketType.report => 'Suspicious or inappropriate activity',
    SupportTicketType.other => 'Anything else',
  };

  IconData get icon => switch (this) {
    SupportTicketType.bug => Icons.bug_report_outlined,
    SupportTicketType.login => Icons.lock_outline_rounded,
    SupportTicketType.account => Icons.person_outline_rounded,
    SupportTicketType.verification => Icons.verified_user_outlined,
    SupportTicketType.event => Icons.event_outlined,
    SupportTicketType.mobileApp => Icons.phone_android_rounded,
    SupportTicketType.featureRequest => Icons.lightbulb_outline_rounded,
    SupportTicketType.report => Icons.flag_outlined,
    SupportTicketType.other => Icons.help_outline_rounded,
  };

  /// Same mapping the portal applies when a ticket is filed.
  SupportPriority get priority => switch (this) {
    SupportTicketType.bug ||
    SupportTicketType.login ||
    SupportTicketType.verification ||
    SupportTicketType.mobileApp ||
    SupportTicketType.report => SupportPriority.issue,
    SupportTicketType.account ||
    SupportTicketType.event ||
    SupportTicketType.other => SupportPriority.support,
    SupportTicketType.featureRequest => SupportPriority.feature,
  };
}

/// Tracking number the way the portal renders it — `Support #010`.
String formatSupportReference(int sequence) =>
    'Support #${sequence.toString().padLeft(3, '0')}';

enum SupportAuthor { you, agent }

class SupportMessage {
  const SupportMessage({
    required this.author,
    required this.body,
    required this.sentAt,
    this.authorName,
  });

  final SupportAuthor author;
  final String body;
  final DateTime sentAt;

  /// Portal account that replied; falls back to "CARES Support" when unset.
  final String? authorName;

  String get timeLabel => formatSupportDateTime(sentAt);
}

/// One ticket as the requester sees it — the server's row, minus the
/// requester block (it is them) and the assignee id.
class SupportRequest {
  const SupportRequest({
    required this.id,
    required this.referenceNumber,
    required this.subject,
    required this.description,
    required this.type,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.conversation,
    this.assignee,
  });

  final String id;
  final int referenceNumber;
  final String subject;
  final String description;
  final SupportTicketType type;
  final SupportRequestStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<SupportMessage> conversation;

  /// Portal account handling the ticket; null while it sits unassigned.
  final String? assignee;

  SupportPriority get priority => type.priority;
  String get referenceId => formatSupportReference(referenceNumber);
  String get submittedLabel => formatSupportDate(createdAt);
  String get updatedLabel => formatSupportDate(updatedAt);
}

const _kShortMonths = [
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

/// `Sep 11, 2026` — the date format used across the support screens.
String formatSupportDate(DateTime at) {
  final local = at.toLocal();
  return '${_kShortMonths[local.month - 1]} ${local.day}, ${local.year}';
}

/// `Sep 11, 2026 · 3:05 PM` for message timestamps.
String formatSupportDateTime(DateTime at) {
  final local = at.toLocal();
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour < 12 ? 'AM' : 'PM';
  return '${formatSupportDate(local)} · $hour12:$minute $period';
}

/// Counts the portal's summary strip shows, computed over the loaded list.
class SupportRequestSummary {
  const SupportRequestSummary({
    required this.total,
    required this.unresolved,
    required this.needsAction,
    required this.resolved,
  });

  factory SupportRequestSummary.of(List<SupportRequest> requests) {
    var unresolved = 0;
    var needsAction = 0;
    var resolved = 0;
    for (final r in requests) {
      if (r.status.isUnresolved) unresolved++;
      if (r.status.needsRequesterAction) needsAction++;
      if (!r.status.isUnresolved) resolved++;
    }
    return SupportRequestSummary(
      total: requests.length,
      unresolved: unresolved,
      needsAction: needsAction,
      resolved: resolved,
    );
  }

  final int total;
  final int unresolved;
  final int needsAction;
  final int resolved;
}

// ---------------------------------------------------------------------------
// Report a Bug (static options)
// ---------------------------------------------------------------------------

/// Where in the app the bug showed up. Prefixes the subject so triage can
/// tell "[Events] app closes" from "[Login] app closes" at a glance.
enum BugArea {
  login,
  registration,
  donations,
  events,
  attendance,
  profile,
  notifications,
  other,
}

extension BugAreaMeta on BugArea {
  String get label => switch (this) {
    BugArea.login => 'Login',
    BugArea.registration => 'Registration',
    BugArea.donations => 'Donations',
    BugArea.events => 'Events',
    BugArea.attendance => 'Attendance',
    BugArea.profile => 'Profile',
    BugArea.notifications => 'Notifications',
    BugArea.other => 'Somewhere else',
  };

  IconData get icon => switch (this) {
    BugArea.login => Icons.login_rounded,
    BugArea.registration => Icons.how_to_reg_outlined,
    BugArea.donations => Icons.volunteer_activism_outlined,
    BugArea.events => Icons.event_outlined,
    BugArea.attendance => Icons.qr_code_scanner_rounded,
    BugArea.profile => Icons.person_outline_rounded,
    BugArea.notifications => Icons.notifications_none_rounded,
    BugArea.other => Icons.more_horiz_rounded,
  };
}

/// How often the bug shows up — helps the team reproduce it.
enum BugFrequency { everyTime, sometimes, once }

extension BugFrequencyMeta on BugFrequency {
  String get label => switch (this) {
    BugFrequency.everyTime => 'Every time',
    BugFrequency.sometimes => 'Sometimes',
    BugFrequency.once => 'Just once',
  };
}

/// Device details attached to a bug report when the reporter opts in. Read
/// off `dart:io` so no extra plugin is needed; the model name is not
/// available without one, so the platform and OS version stand in for it.
class BugDeviceInfo {
  const BugDeviceInfo._();

  static String get os =>
      '${Platform.operatingSystem} ${Platform.operatingSystemVersion}'.trim();
  static String get summary => os;
}

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
