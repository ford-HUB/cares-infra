import 'package:flutter/material.dart';
import 'package:mobile/core/session/app_role.dart';

/// Unknown server categories fall back to [system] so a new one never blanks a
/// row.
enum NotificationType {
  event,
  donation,
  activity,
  certificate,
  request,
  support,
  account,
  system,
}

extension NotificationTypeX on NotificationType {
  String get label => switch (this) {
    NotificationType.event => 'Events',
    NotificationType.donation => 'Donations',
    NotificationType.activity => 'Activity',
    NotificationType.certificate => 'Certificates',
    NotificationType.request => 'Requests',
    NotificationType.support => 'Support',
    NotificationType.account => 'Account',
    NotificationType.system => 'Announcements',
  };
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.type,
    required this.attention,
    required this.isUnread,
    this.audienceRole,
    this.href,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final tone = json['tone'] as String? ?? 'INFO';
    final audience = json['audience_role'] as String?;
    return AppNotification(
      id: json['notification_id'] as String,
      title: json['title'] as String? ?? '',
      message: json['description'] as String? ?? '',
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
      type: _typeFor(json['category'] as String?),
      attention: tone != 'INFO',
      isUnread: !(json['read'] as bool? ?? false),
      audienceRole: audience == null ? null : AppRoleX.fromApiValue(audience),
      href: json['href'] as String?,
    );
  }

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final NotificationType type;

  /// ATTENTION or CRITICAL on the server — worth a louder pop.
  final bool attention;
  final bool isUnread;

  /// Null means account-wide (support, role unlocks, …), shown on every side.
  final AppRole? audienceRole;

  /// `/events/<id>`, `/events/<id>/feedback`, `/donations/<id>`,
  /// `/requests/<id>`, `/support/<id>`, or a portal path the app can't open.
  final String? href;

  /// Own cancellation or the event called off; drawn as a red title-only card
  /// (the server's follow-up line is hidden).
  bool get isCancellation =>
      type == NotificationType.event &&
      (title.startsWith('Registration cancelled for ') ||
          title.endsWith(' was cancelled'));

  bool get isToday {
    final now = DateTime.now();
    return createdAt.year == now.year &&
        createdAt.month == now.month &&
        createdAt.day == now.day;
  }

  /// Since Monday.
  bool get isThisWeek {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final monday = today.subtract(Duration(days: now.weekday - 1));
    return !createdAt.isBefore(monday);
  }

  bool isFor(AppRole role) => audienceRole == null || audienceRole == role;

  AppNotification copyWith({bool? isUnread}) => AppNotification(
    id: id,
    title: title,
    message: message,
    createdAt: createdAt,
    type: type,
    attention: attention,
    isUnread: isUnread ?? this.isUnread,
    audienceRole: audienceRole,
    href: href,
  );

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${(diff.inDays / 7).floor()}w ago';
  }

  static NotificationType _typeFor(String? category) => switch (category) {
    'EVENT' => NotificationType.event,
    'DONATION' => NotificationType.donation,
    'VOLUNTEER' => NotificationType.activity,
    'CERTIFICATE' => NotificationType.certificate,
    'USER_REQUEST' => NotificationType.request,
    'SUPPORT' => NotificationType.support,
    'ACCESS' || 'SECURITY' => NotificationType.account,
    _ => NotificationType.system,
  };
}

/// Applied on top of the kind filter.
enum NotificationPeriod { today, thisWeek }

extension NotificationPeriodX on NotificationPeriod {
  String get label => switch (this) {
    NotificationPeriod.today => 'Today',
    NotificationPeriod.thisWeek => 'This week',
  };

  bool includes(AppNotification item) => switch (this) {
    NotificationPeriod.today => item.isToday,
    NotificationPeriod.thisWeek => item.isThisWeek,
  };
}

class NotificationFeed {
  const NotificationFeed({required this.unread, required this.items});

  factory NotificationFeed.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? const {};
    return NotificationFeed(
      unread: summary['unread'] as int? ?? 0,
      items: (json['items'] as List<dynamic>? ?? const [])
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  static const empty = NotificationFeed(unread: 0, items: []);

  final int unread;
  final List<AppNotification> items;
}

IconData iconForNotificationType(NotificationType type) {
  return switch (type) {
    NotificationType.event => Icons.event_available_rounded,
    NotificationType.donation => Icons.favorite_rounded,
    NotificationType.activity => Icons.star_rounded,
    NotificationType.certificate => Icons.workspace_premium_rounded,
    NotificationType.request => Icons.assignment_turned_in_rounded,
    NotificationType.support => Icons.support_agent_rounded,
    NotificationType.account => Icons.shield_outlined,
    NotificationType.system => Icons.campaign_rounded,
  };
}
