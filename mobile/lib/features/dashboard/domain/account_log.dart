import 'package:flutter/material.dart';

/// Chip groups on the Activity Logs screen. Derived on the app side from the
/// server's `action` key (`auth.mobile.sign-in`, `profile.updated`, …) so the
/// grouping can change without a server release.
enum AccountLogCategory {
  signIn,
  profile,
  security,
  roles,
  events,
  attendance,
  permissions,
  records,
  support,
  other,
}

extension AccountLogCategoryX on AccountLogCategory {
  String get label => switch (this) {
    AccountLogCategory.signIn => 'Sign-in',
    AccountLogCategory.profile => 'Profile',
    AccountLogCategory.security => 'Security',
    AccountLogCategory.roles => 'Roles',
    AccountLogCategory.events => 'Events',
    AccountLogCategory.attendance => 'Attendance',
    AccountLogCategory.permissions => 'Permissions',
    AccountLogCategory.records => 'Records',
    AccountLogCategory.support => 'Support',
    AccountLogCategory.other => 'Other',
  };

  IconData get icon => switch (this) {
    AccountLogCategory.signIn => Icons.login_rounded,
    AccountLogCategory.profile => Icons.person_outline_rounded,
    AccountLogCategory.security => Icons.lock_outline_rounded,
    AccountLogCategory.roles => Icons.swap_horiz_rounded,
    AccountLogCategory.events => Icons.event_outlined,
    AccountLogCategory.attendance => Icons.where_to_vote_outlined,
    AccountLogCategory.permissions => Icons.verified_user_outlined,
    AccountLogCategory.records => Icons.description_outlined,
    AccountLogCategory.support => Icons.support_agent_rounded,
    AccountLogCategory.other => Icons.circle_outlined,
  };

  /// Maps a server action key to the chip it belongs under.
  static AccountLogCategory fromAction(String action) {
    if (action.startsWith('auth.') && action.contains('password')) {
      return AccountLogCategory.security;
    }
    if (action.startsWith('auth.')) return AccountLogCategory.signIn;
    if (action.startsWith('account.role.')) return AccountLogCategory.roles;
    if (action.startsWith('account.')) return AccountLogCategory.security;
    // Staff actions on the account (restrictions, IP blocks, reissued
    // credentials) and device sign-outs are about who can get in.
    if (action.startsWith('user.') || action.startsWith('session.')) {
      return AccountLogCategory.security;
    }
    if (action.startsWith('access-control.')) {
      return AccountLogCategory.permissions;
    }
    if (action.startsWith('profile.')) return AccountLogCategory.profile;
    if (action.startsWith('support.')) return AccountLogCategory.support;
    if (action.startsWith('attendance.')) return AccountLogCategory.attendance;
    if (action.startsWith('events.') || action.startsWith('event.')) {
      return AccountLogCategory.events;
    }
    if (action.startsWith('permissions.'))
      return AccountLogCategory.permissions;
    if (action.startsWith('records.') || action.startsWith('geolocation.')) {
      return AccountLogCategory.records;
    }
    return AccountLogCategory.other;
  }
}

/// One row on the Activity Logs timeline.
class AccountLogEntry {
  const AccountLogEntry({
    required this.id,
    required this.action,
    required this.category,
    required this.title,
    required this.detail,
    required this.at,
    required this.flagged,
  });

  final String id;
  final String action;
  final AccountLogCategory category;
  final String title;

  /// One line of context — what changed, where from.
  final String detail;
  final DateTime at;

  /// Highlight actions that didn't go through — a refused sign-in, a denied
  /// request — so the person can spot activity they may not recognise.
  final bool flagged;
}
