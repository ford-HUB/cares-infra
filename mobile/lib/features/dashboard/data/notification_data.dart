import 'package:flutter/material.dart';

enum NotificationType { event, donation, activity, system }

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.timeAgo,
    required this.type,
    this.isUnread = true,
  });

  final String id;
  final String title;
  final String message;
  final String timeAgo;
  final NotificationType type;
  final bool isUnread;
}

const kMockNotifications = [
  AppNotification(
    id: 'n1',
    title: 'Event reminder',
    message:
        'Coastal Cleanup Drive starts tomorrow at 8:00 AM. '
        'Check in with geolocation when you arrive at the venue.',
    timeAgo: '2h ago',
    type: NotificationType.event,
  ),
  AppNotification(
    id: 'n2',
    title: 'Registration confirmed',
    message:
        'You are registered for School Supplies Distribution on Jun 21. '
        'View your event details anytime in Activities.',
    timeAgo: '1d ago',
    type: NotificationType.event,
  ),
  AppNotification(
    id: 'n3',
    title: 'Donation received',
    message:
        'Thank you for donating to CARES Health Fund. '
        'Your contribution is now reflected in your profile.',
    timeAgo: '2d ago',
    type: NotificationType.donation,
  ),
  AppNotification(
    id: 'n4',
    title: 'Points earned',
    message:
        'You earned 25 points for attending Medical Mission — Minglanilla. '
        'Check your rank on the Leaderboard.',
    timeAgo: '3d ago',
    type: NotificationType.activity,
    isUnread: false,
  ),
  AppNotification(
    id: 'n5',
    title: 'New campaign available',
    message:
        'Tree Planting Fund is now open for donations. '
        'Help us reach our environmental goals this month.',
    timeAgo: '5d ago',
    type: NotificationType.donation,
    isUnread: false,
  ),
];

IconData iconForNotificationType(NotificationType type) {
  return switch (type) {
    NotificationType.event => Icons.event_available_rounded,
    NotificationType.donation => Icons.favorite_rounded,
    NotificationType.activity => Icons.star_rounded,
    NotificationType.system => Icons.info_outline_rounded,
  };
}
