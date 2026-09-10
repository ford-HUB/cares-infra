import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/core/services/auth_session.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.errors});

  final String message;
  final int? statusCode;
  final dynamic errors;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const String apiVersion = 'v1';

  final http.Client _client;

  String get baseUrl {
    final configured = dotenv.env['API_BASE_URL']?.trim();
    if (configured == null || configured.isEmpty) {
      throw ApiException('API_BASE_URL is not configured in .env');
    }
    return configured.endsWith('/')
        ? configured.substring(0, configured.length - 1)
        : configured;
  }

  Uri uri(String path) {
    var normalizedPath = path.startsWith('/') ? path : '/$path';
    final versionPrefix = '/$apiVersion';
    if (!normalizedPath.startsWith('$versionPrefix/')) {
      normalizedPath = '$versionPrefix$normalizedPath';
    }
    return Uri.parse('$baseUrl$normalizedPath');
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    bool authenticate = true,
  }) async {
    return _guard(() async {
      final response = await _client
          .get(uri(path), headers: _jsonHeaders(authenticate: authenticate))
          .timeout(const Duration(seconds: 30));
      return _parseResponse(response);
    }, path);
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    required Map<String, dynamic> body,
    Duration timeout = const Duration(seconds: 30),
    bool authenticate = true,
  }) async {
    return _guard(() async {
      final response = await _client
          .post(
            uri(path),
            headers: _jsonHeaders(authenticate: authenticate),
            body: jsonEncode(body),
          )
          .timeout(timeout);
      return _parseResponse(response);
    }, path);
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    required Map<String, dynamic> body,
    Duration timeout = const Duration(seconds: 30),
    bool authenticate = true,
  }) async {
    return _guard(() async {
      final response = await _client
          .put(
            uri(path),
            headers: _jsonHeaders(authenticate: authenticate),
            body: jsonEncode(body),
          )
          .timeout(timeout);
      return _parseResponse(response);
    }, path);
  }

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required Map<String, String> fields,
    required List<http.MultipartFile> files,
  }) async {
    return _guard(() async {
      final request = http.MultipartRequest('POST', uri(path))
        ..fields.addAll(fields)
        ..files.addAll(files);

      final streamed = await _client
          .send(request)
          .timeout(const Duration(seconds: 60));
      final response = await http.Response.fromStream(streamed);
      return _parseResponse(response);
    }, path);
  }

  Future<Map<String, dynamic>> _guard(
    Future<Map<String, dynamic>> Function() request,
    String path,
  ) async {
    try {
      return await request();
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
        'Cannot reach API at ${uri(path)}. '
        'On a physical device use your PC LAN IP in API_BASE_URL (not 10.0.2.2). '
        'Details: $e',
      );
    }
  }

  Map<String, dynamic> _parseResponse(http.Response response) {
    Map<String, dynamic>? body;
    if (response.body.isNotEmpty) {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        body = decoded;
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message =
          body?['message'] as String? ??
          'Request failed (${response.statusCode})';
      throw ApiException(
        message,
        statusCode: response.statusCode,
        errors: body?['errors'],
      );
    }

    if (body == null) {
      throw ApiException('Empty response from server');
    }

    if (body['ok'] != true) {
      throw ApiException(
        body['message'] as String? ?? 'Request failed',
        statusCode: response.statusCode,
        errors: body['errors'],
      );
    }

    return body;
  }

  Map<String, String> _jsonHeaders({bool authenticate = true}) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (!authenticate) {
      return headers;
    }

    final token = AuthSession.accessToken;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }
}
