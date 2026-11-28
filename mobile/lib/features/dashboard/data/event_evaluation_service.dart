import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/event_evaluation_models.dart';

class EvaluationSubmissionSummary {
  const EvaluationSubmissionSummary({
    required this.eventId,
    required this.submittedAt,
  });

  factory EvaluationSubmissionSummary.fromJson(Map<String, dynamic> json) {
    return EvaluationSubmissionSummary(
      eventId: json['event_id'] as int,
      submittedAt: DateTime.parse(json['submitted_at'] as String).toLocal(),
    );
  }

  final int eventId;
  final DateTime submittedAt;
}

/// The questionnaire the director assigned to the event (or the default).
class EventEvaluationService {
  EventEvaluationService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<EventEvaluation> fetchForEvent(int eventId) async {
    final response = await _api.getJson('/evaluation/events/$eventId');
    return EventEvaluation.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// The server rejects a second submission; check [EventEvaluation.canSubmit]
  /// first. With [images] it goes multipart: `answers` as JSON plus
  /// `image_<questionId>` files.
  Future<EvaluationSubmission> submit(
    int eventId,
    Map<String, dynamic> answers, {
    Map<String, List<String>> images = const {},
  }) async {
    final path = '/evaluation/events/$eventId/responses';
    final hasImages = images.values.any((paths) => paths.isNotEmpty);
    final response = hasImages
        ? await _api.postMultipart(
            path,
            fields: {'answers': jsonEncode(answers)},
            files: [
              for (final entry in images.entries)
                for (final filePath in entry.value)
                  await http.MultipartFile.fromPath(
                    'image_${entry.key}',
                    filePath,
                  ),
            ],
          )
        : await _api.postJson(path, body: {'answers': answers});
    final data = response['data'] as Map<String, dynamic>;
    return EvaluationSubmission.fromJson(
      data['submission'] as Map<String, dynamic>,
    );
  }

  /// Hydrates the activity tab's "Feedback: Submitted" badge after a restart.
  Future<List<EvaluationSubmissionSummary>> fetchSubmissions() async {
    final response = await _api.getJson('/evaluation/submissions');
    final data = response['data'] as Map<String, dynamic>;
    return (data['submissions'] as List<dynamic>? ?? const [])
        .map(
          (e) =>
              EvaluationSubmissionSummary.fromJson(e as Map<String, dynamic>),
        )
        .toList();
  }
}
