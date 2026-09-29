import 'package:flutter/material.dart';

/// The goods a director can tick on an event's "Accepted Donations" panel.
/// Mirrors the server's `shared/constants/goods-types.ts` and the portal's
/// `GOODS_TYPE_OPTIONS`; the ids are what the server stores.
class GoodsType {
  const GoodsType({
    required this.id,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String id;
  final String label;
  final IconData icon;
  final Color color;
}

abstract final class GoodsTypes {
  static const all = [
    GoodsType(
      id: 'food',
      label: 'Food',
      icon: Icons.restaurant_rounded,
      color: Color(0xFFEA580C),
    ),
    GoodsType(
      id: 'clothing',
      label: 'Clothing',
      icon: Icons.checkroom_rounded,
      color: Color(0xFF2563EB),
    ),
    GoodsType(
      id: 'medicine',
      label: 'Medicine',
      icon: Icons.medical_services_rounded,
      color: Color(0xFFDC2626),
    ),
    GoodsType(
      id: 'books',
      label: 'Books',
      icon: Icons.menu_book_rounded,
      color: Color(0xFF9333EA),
    ),
    GoodsType(
      id: 'hygiene',
      label: 'Hygiene',
      icon: Icons.water_drop_rounded,
      color: Color(0xFF0891B2),
    ),
    GoodsType(
      id: 'supplies',
      label: 'Supplies',
      icon: Icons.inventory_2_rounded,
      color: Color(0xFF16A34A),
    ),
    GoodsType(
      id: 'other',
      label: 'Other',
      icon: Icons.add_circle_outline_rounded,
      color: Color(0xFF64748B),
    ),
  ];

  /// The catch-all the donor picks for something not on the event's list.
  static const other = GoodsType(
    id: 'other',
    label: 'Other',
    icon: Icons.add_circle_outline_rounded,
    color: Color(0xFF64748B),
  );

  static GoodsType byId(String id) =>
      all.firstWhere((type) => type.id == id, orElse: () => other);

  static String labelOf(String? id) => id == null ? 'Goods' : byId(id).label;

  /// The event's ticked types in catalog order; `other` is offered separately.
  static List<GoodsType> forEvent(List<String> ids) => [
    for (final type in all)
      if (type.id != 'other' && ids.contains(type.id)) type,
  ];
}
