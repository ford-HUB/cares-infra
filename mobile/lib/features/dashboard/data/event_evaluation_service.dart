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

/// `/evaluation/*` — the post-event questionnaire the director publishes in
/// the portal and the answers a volunteer sends back for a completed event.
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
  Future<EvaluationSubmission> submit(
    int eventId,
    Map<String, dynamic> answers,
  ) async {
    final response = await _api.postJson(
      '/evaluation/events/$eventId/responses',
      body: {'answers': answers},
    );
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
