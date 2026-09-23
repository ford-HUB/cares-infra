import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// What a goods pledge carries — the same fields for a new pledge and an edit.
/// Goods are handed in at the CARES Office, so there is no address or time to
/// collect: just the day the donor plans to deliver and a number to reach them.
class GoodsPledgeInput {
  const GoodsPledgeInput({
    required this.goodsType,
    required this.goodsItem,
    required this.quantity,
    required this.contactNumber,
    required this.deliveryDate,
  });

  final String goodsType;
  final String? goodsItem;
  final int quantity;
  final String contactNumber;
  final DateTime deliveryDate;

  Map<String, dynamic> toJson() => {
    'goodsType': goodsType,
    if (goodsItem != null && goodsItem!.trim().isNotEmpty)
      'goodsItem': goodsItem!.trim(),
    'quantity': quantity,
    'contactNumber': contactNumber,
    'deliveryDate': DonationFormat.isoDate(deliveryDate),
  };
}

/// The donor's ledger and campaign feed: `/events/donations` for what can be
/// given to, `/donations/*` for what was given. Money checkouts stay in
/// `DonationPaymentService`; the ledger row they open comes back through
/// [fetchDonation].
class DonationService {
  DonationService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  /// Open events with money or goods donations enabled, soonest first.
  Future<List<DonationCampaign>> fetchCampaigns() async {
    final response = await _api.getJson('/events/donations');
    final data = response['data'] as Map<String, dynamic>;
    return (data['events'] as List<dynamic>? ?? const [])
        .map(
          (e) => DonationCampaign(
            RecommendedEvent.fromJson(e as Map<String, dynamic>),
          ),
        )
        .toList();
  }

  /// Every donation the caller made, latest first.
  Future<List<Donation>> fetchMine() async {
    final response = await _api.getJson('/donations/me');
    final data = response['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>? ?? const [])
        .map((e) => Donation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Donation> fetchDonation(String id) async {
    final response = await _api.getJson('/donations/$id');
    return Donation.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<Donation> pledgeGoods({
    required int eventId,
    required GoodsPledgeInput input,
  }) async {
    final response = await _api.postJson(
      '/donations/goods',
      body: {'eventId': eventId, ...input.toJson()},
    );
    return Donation.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<Donation> updateGoods(String id, GoodsPledgeInput input) async {
    final response = await _api.patchJson(
      '/donations/$id/goods',
      body: input.toJson(),
    );
    return Donation.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<Donation> cancel(String id) async {
    final response = await _api.postJson(
      '/donations/$id/cancel',
      body: const {},
    );
    return Donation.fromJson(response['data'] as Map<String, dynamic>);
  }
}
