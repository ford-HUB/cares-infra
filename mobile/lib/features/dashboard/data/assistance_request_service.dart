import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';

/// The beneficiary's assistance requests — `v1/assistance-requests/me`.
class AssistanceRequestService {
  AssistanceRequestService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  static const _path = '/assistance-requests/me';

  Future<List<AssistanceRequest>> fetchMine() async {
    final response = await _api.getJson(_path);
    final data = response['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>)
        .map((i) => assistanceRequestFromJson(i as Map<String, dynamic>))
        .toList(growable: false);
  }

  /// Multipart: the fields as text beside up to three `attachments`.
  /// [categoryCode] and [urgencyCode] are the server enums (`FOOD`, `HIGH`).
  Future<AssistanceRequest> create({
    required String title,
    required String categoryCode,
    required String description,
    required String urgencyCode,
    LatLng? location,
    String? locationDetails,
    List<RequestAttachment> attachments = const [],
  }) async {
    final files = await Future.wait(
      attachments.map(
        (file) => http.MultipartFile.fromPath(
          'attachments',
          file.path,
          filename: file.name,
          contentType: _mediaTypeFor(file.extension),
        ),
      ),
    );
    final response = await _api.postMultipart(
      _path,
      // Household size is read from the profile server-side, and the body
      // is validated strictly, so it is not sent here.
      fields: {
        'title': title,
        'category': categoryCode,
        'description': description,
        'urgency': urgencyCode,
        if (location != null) ...{
          'location_latitude': '${location.latitude}',
          'location_longitude': '${location.longitude}',
        },
        if (locationDetails != null && locationDetails.isNotEmpty)
          'location_details': locationDetails,
      },
      files: files,
    );
    return assistanceRequestFromJson(response['data'] as Map<String, dynamic>);
  }

  /// `PATCH me/:id` — every field the form shows; a null [location] removes
  /// the pin. Attachments stay as filed.
  Future<AssistanceRequest> update(
    String id, {
    required String title,
    required String categoryCode,
    required String description,
    required String urgencyCode,
    LatLng? location,
    String? locationDetails,
  }) async {
    final response = await _api.patchJson(
      '$_path/$id',
      body: {
        'title': title,
        'category': categoryCode,
        'description': description,
        'urgency': urgencyCode,
        'location_latitude': location?.latitude,
        'location_longitude': location?.longitude,
        'location_details': (locationDetails?.isEmpty ?? true)
            ? null
            : locationDetails,
      },
    );
    return assistanceRequestFromJson(response['data'] as Map<String, dynamic>);
  }

  /// `POST me/:id/cancel` with an optional reason.
  Future<AssistanceRequest> cancel(String id, {String? reason}) async {
    final response = await _api.postJson(
      '$_path/$id/cancel',
      body: {if (reason != null && reason.isNotEmpty) 'reason': reason},
    );
    return assistanceRequestFromJson(response['data'] as Map<String, dynamic>);
  }

  MediaType? _mediaTypeFor(String extension) => switch (extension) {
    'png' => MediaType('image', 'png'),
    'webp' => MediaType('image', 'webp'),
    'heic' => MediaType('image', 'heic'),
    'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
    'pdf' => MediaType('application', 'pdf'),
    _ => null,
  };
}
