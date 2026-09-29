import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

class InterestCatalogItem {
  const InterestCatalogItem({
    required this.code,
    required this.label,
    this.description,
    required this.sortOrder,
  });

  factory InterestCatalogItem.fromJson(Map<String, dynamic> json) {
    return InterestCatalogItem(
      code: json['code'] as String? ?? '',
      label: json['label'] as String? ?? '',
      description: json['description'] as String?,
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
    );
  }

  final String code;
  final String label;
  final String? description;
  final int sortOrder;

  UserInterest? get asUserInterest => UserInterestX.fromApiValue(code);
}

class InterestsService {
  InterestsService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();

  final ApiClient _api;

  Future<List<InterestCatalogItem>> fetchInterests() async {
    final response = await _api.getJson('/interests');
    final data = response['data'] as List<dynamic>? ?? const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(InterestCatalogItem.fromJson)
        .toList();
  }

  Future<void> saveInterests({required Set<UserInterest> interests}) async {
    await _api.putJson(
      '/interests',
      body: {
        'selected': interests.map((interest) => interest.apiValue).toList(),
      },
    );
  }
}
