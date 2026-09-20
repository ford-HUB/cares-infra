import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';

/// `/certificates/*` — the certificates the issuing scheduler generated for
/// the signed-in volunteer.
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

  /// Opening a certificate is what the portal counts as it being claimed, so
  /// this is called when the sheet is actually shown, not when it is listed.
  Future<CaresCertificate> open(String id) async {
    final response = await _api.getJson('/certificates/$id');
    return CaresCertificate.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Absolute URL for an image path the server put on the sheet
  /// (`/api/v1/certificates/…`), fetched with [imageHeaders].
  String imageUrl(String apiPath) {
    final path = apiPath.startsWith('/api/')
        ? apiPath.substring('/api'.length)
        : apiPath;
    return _api.uri(path).toString();
  }

  Map<String, String> get imageHeaders => _api.authHeaders();
}
