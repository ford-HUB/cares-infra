import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';

/// The beneficiary's Needs Assessment Survey — `v1/residential-needs/me`.
/// One survey per account: the first submit creates it, later ones update it.
class NeedsAssessmentService {
  NeedsAssessmentService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const _path = '/residential-needs/me';

  Future<NeedsAssessmentSummary> fetchMine() async {
    final response = await _api.getJson(_path);
    return needsAssessmentSummaryFromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<NeedsAssessmentSummary> submit(NeedsAssessmentResponse answers) async {
    final response = await _api.putJson(
      _path,
      body: needsAssessmentToJson(answers),
    );
    return needsAssessmentSummaryFromJson(
      response['data'] as Map<String, dynamic>,
    );
  }
}
