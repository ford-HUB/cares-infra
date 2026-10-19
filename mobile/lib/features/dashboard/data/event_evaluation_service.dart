import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/event_evaluation_models.dart';

/// One event the volunteer already gave feedback on.
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

/// `/evaluation/*` — the post-event questionnaire the director assigned to this
/// event in the portal (or the default one) and the answers a volunteer sends
/// back for a completed event.
class EventEvaluationService {
  EventEvaluationService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<EventEvaluation> fetchForEvent(int eventId) async {
    final response = await _api.getJson('/evaluation/events/$eventId');
    return EventEvaluation.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Sends the answers keyed by question id. The server rejects a second
  /// submission for the same event, so callers check [EventEvaluation.canSubmit]
  /// first.
  ///
  /// [images] holds the picked photo paths per image-upload question. When
  /// there are any, the request goes multipart: `answers` as a JSON string and
  /// each photo under `image_<questionId>`; the server stores them and fills
  /// those answers itself.
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

  /// Every event this volunteer has answered for — what the activity tab's
  /// "Feedback: Submitted" badge is hydrated from after a restart.
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
