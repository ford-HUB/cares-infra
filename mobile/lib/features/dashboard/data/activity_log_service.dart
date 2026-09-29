import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/activity_log_models.dart';

/// The caller's own audit trail, keyset-paged by the id of the last row seen.
class ActivityLogService {
  ActivityLogService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const pageSize = 30;

  Future<ActivityLogPage> fetchPage({String? cursor}) async {
    final query = {'limit': '$pageSize', 'cursor': ?cursor};
    final response = await _api.getJson(
      Uri(path: '/audit-logs/me', queryParameters: query).toString(),
    );
    return ActivityLogPage.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Reports a device-side action (a role switch or unlock) so it lands in the
  /// same trail as server actions. Best-effort: the switch already happened
  /// on the device, so a failed report is logged and otherwise ignored.
  Future<void> recordClientActivity(
    String action, {
    Map<String, String> metadata = const {},
  }) async {
    try {
      await _api.postJson(
        '/audit-logs/me/activity',
        body: {'action': action, 'metadata': metadata},
      );
    } catch (error) {
      debugPrint('Activity report "$action" failed: $error');
    }
  }

  /// Fire-and-forget [recordClientActivity] for call sites that must not wait.
  static void report(String action, {Map<String, String> metadata = const {}}) {
    unawaited(
      ActivityLogService().recordClientActivity(action, metadata: metadata),
    );
  }
}
