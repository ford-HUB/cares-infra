import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../../core/network/api_exception.dart';
import '../registration/models/registration_data.dart';

class AuthApi {
  AuthApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<Map<String, dynamic>> register(RegistrationData data) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.baseUrl}/auth/register'),
    );

    void addField(String key, String? value) {
      if (value != null && value.trim().isNotEmpty) {
        request.fields[key] = value.trim();
      }
    }

    addField('accountType', _accountTypeValue(data.accountType));
    addField('beneficiaryType', _beneficiaryTypeValue(data.beneficiaryType));
    addField('userRole', _userRoleValue(data.userRole));
    addField('firstName', data.firstName);
    addField('middleName', data.middleName);
    addField('lastName', data.lastName);
    addField('email', data.email);
    addField('phoneNumber', data.phoneNumber);
    addField('schoolIdNumber', data.schoolIdNumber);
    addField('department', data.department);
    addField('course', data.course);
    addField('yearLevel', data.yearLevel);
    addField('dateOfBirth', data.dateOfBirth);
    addField('gender', data.gender);
    addField('address', data.address);
    addField('organizationName', data.organizationName);
    request.fields['password'] = data.password;

    if (data.schoolIdImagePath != null) {
      request.files.add(
        await http.MultipartFile.fromPath(
          'schoolIdImage',
          data.schoolIdImagePath!,
        ),
      );
    }
    if (data.selfieImagePath != null) {
      request.files.add(
        await http.MultipartFile.fromPath(
          'selfieImage',
          data.selfieImagePath!,
        ),
      );
    }
    if (data.facePicturePath != null) {
      request.files.add(
        await http.MultipartFile.fromPath(
          'facePicture',
          data.facePicturePath!,
        ),
      );
    }

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );
    return _decodeResponse(response);
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    Map<String, dynamic>? body;
    if (response.body.isNotEmpty) {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        body = decoded;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body ?? <String, dynamic>{};
    }

    final message = _extractErrorMessage(body) ??
        'Request failed with status ${response.statusCode}';
    throw ApiException(message, statusCode: response.statusCode);
  }

  String? _extractErrorMessage(Map<String, dynamic>? body) {
    if (body == null) return null;

    final message = body['message'];
    if (message is String) return message;
    if (message is List) {
      return message.map((item) => item.toString()).join('\n');
    }

    final error = body['error'];
    if (error is String) return error;

    return null;
  }

  String? _accountTypeValue(AccountType? type) => switch (type) {
        AccountType.regularUser => 'regularUser',
        AccountType.beneficiary => 'beneficiary',
        null => null,
      };

  String? _beneficiaryTypeValue(BeneficiaryType? type) => switch (type) {
        BeneficiaryType.individual => 'individual',
        BeneficiaryType.organizationMember => 'organizationMember',
        null => null,
      };

  String? _userRoleValue(UserRole? role) => switch (role) {
        UserRole.student => 'student',
        UserRole.staff => 'staff',
        UserRole.faculty => 'faculty',
        null => null,
      };
}
