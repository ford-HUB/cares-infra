import 'package:flutter/material.dart';

/// The server's notification categories, folded into the four looks the feed
/// draws. Unknown values fall back to [system] so a new category never blanks
/// a row.
enum NotificationType { event, donation, activity, system }

/// One row of the person's feed as the server holds it.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.type,
    required this.attention,
    required this.isUnread,
    this.href,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final tone = json['tone'] as String? ?? 'INFO';
    return AppNotification(
      id: json['notification_id'] as String,
      title: json['title'] as String? ?? '',
      message: json['description'] as String? ?? '',
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
      type: _typeFor(json['category'] as String?),
      attention: tone != 'INFO',
      isUnread: !(json['read'] as bool? ?? false),
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

  /// Where the row leads: `/events/<id>` for an event, `/events/<id>/feedback`
  /// for the questionnaire, or a portal path the app cannot open.
  final String? href;

  AppNotification copyWith({bool? isUnread}) => AppNotification(
    id: id,
    title: title,
    message: message,
    createdAt: createdAt,
    type: type,
    attention: attention,
    isUnread: isUnread ?? this.isUnread,
    href: href,
  );

  /// "2h ago" style label for the list.
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
    'VOLUNTEER' || 'CERTIFICATE' => NotificationType.activity,
    _ => NotificationType.system,
  };
}

/// The feed plus its unread count.
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
    NotificationType.system => Icons.info_outline_rounded,
  };
}
