import 'dart:math';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_payment_models.dart';

/// `/donations/payments` — opens a Xendit checkout for a money donation and
/// watches it settle. The server owns the gateway; the app only ever sees the
/// hand-off (a URL to open or a QR string to draw) and the resulting status.
class DonationPaymentService {
  DonationPaymentService({ApiClient? apiClient})
    : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// Starts a checkout. [idempotencyKey] is minted once per attempt with
  /// [newIdempotencyKey] and re-sent on retry, so a request that timed out
  /// after the server already opened the charge comes back with the same
  /// checkout instead of a second one.
  Future<DonationPayment> createPayment({
    required String idempotencyKey,
    required String campaignId,
    required String campaignTitle,
    required int amount,
    required DonationPaymentMethod method,
    int? eventId,
  }) async {
    final response = await _api.postJson(
      '/donations/payments',
      headers: {'Idempotency-Key': idempotencyKey},
      timeout: const Duration(seconds: 45),
      body: {
        'campaignId': campaignId,
        'campaignTitle': campaignTitle,
        'amount': amount,
        'method': method.wireValue,
        'eventId': ?eventId,
      },
    );
    return DonationPayment.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<DonationPayment> fetchPayment(String id) async {
    final response = await _api.getJson('/donations/payments/$id');
    return DonationPayment.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// RFC 4122 v4 UUID from the platform's secure RNG.
  static String newIdempotencyKey() {
    final rng = Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }
}
