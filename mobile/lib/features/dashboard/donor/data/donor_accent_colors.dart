import 'package:flutter/material.dart';

/// Icon accents shared by the donor home and activity tabs.
///
/// Static design values — same idea as the event category palette, so the
/// donor stats, donation types, and meta rows read at a glance.
abstract final class DonorAccents {
  /// Total amount given.
  static const donated = Color(0xFFE65100);

  /// Number of donations made.
  static const donations = Color(0xFFE53935);

  /// Campaigns supported.
  static const campaigns = Color(0xFF1976D2);

  /// Cash donations.
  static const money = Color(0xFF2D7634);

  /// In-kind / goods donations.
  static const goods = Color(0xFFF9A825);

  /// Dates on donation cards.
  static const date = Color(0xFF5C6BC0);
}
