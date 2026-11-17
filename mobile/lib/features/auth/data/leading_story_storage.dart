import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Remembers that this install has already been through the leading story,
/// so it plays once on a fresh install and later launches land on login.
///
/// Best-effort like [SessionStorage]: preferences that cannot be read count
/// as "not seen", which only means the story plays again.
class LeadingStoryStorage {
  LeadingStoryStorage._();

  static final LeadingStoryStorage instance = LeadingStoryStorage._();

  static const _seenKey = 'onboarding.leading_story.seen';

  Future<bool> hasSeen() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_seenKey) ?? false;
    } catch (error) {
      debugPrint('LeadingStoryStorage.hasSeen failed: $error');
      return false;
    }
  }

  Future<void> markSeen() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_seenKey, true);
    } catch (error) {
      debugPrint('LeadingStoryStorage.markSeen failed: $error');
    }
  }
}
