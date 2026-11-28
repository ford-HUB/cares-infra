import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';

class CertificateService {
  CertificateService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<List<CaresCertificate>> fetchMine() async {
    final response = await _api.getJson('/certificates');
    final data = response['data'] as Map<String, dynamic>;
    return (data['certificates'] as List<dynamic>? ?? const [])
        .map((e) => CaresCertificate.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Opening counts as claimed on the portal, so call it when the sheet is
  /// shown, not listed.
  Future<CaresCertificate> open(String id) async {
    final response = await _api.getJson('/certificates/$id');
    return CaresCertificate.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// For server image paths (`/api/v1/certificates/…`), fetched with
  /// [imageHeaders].
  String imageUrl(String apiPath) {
    final path = apiPath.startsWith('/api/')
        ? apiPath.substring('/api'.length)
        : apiPath;
    return _api.uri(path).toString();
  }

  Map<String, String> get imageHeaders => _api.authHeaders();
}
