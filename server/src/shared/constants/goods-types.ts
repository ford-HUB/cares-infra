/**
 * The goods a director can tick on an event's "Accepted Donations" panel. Mirrors
 * `site/src/constants/event.ts` (`GOODS_TYPE_OPTIONS`) and the app's
 * `goods_types.dart`; the ids are what `Event.goods_types` and
 * `Donation.goods_type` store.
 */
export const GOODS_TYPES = [
  { id: 'food', label: 'Food' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'medicine', label: 'Medicine' },
  { id: 'books', label: 'Books' },
  { id: 'hygiene', label: 'Hygiene' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'other', label: 'Other' },
] as const;

export type GoodsTypeId = (typeof GOODS_TYPES)[number]['id'];

export const GOODS_TYPE_IDS = GOODS_TYPES.map((type) => type.id) as [
  GoodsTypeId,
  ...GoodsTypeId[],
];

/**
 * Pesos credited per unit of each goods type when a goods donation is scored for
 * the donor board. The shipped defaults; Rankings → Customization overrides them
 * in `RankingSettings.goods_type_values`.
 */
export const DEFAULT_GOODS_TYPE_VALUES: Record<GoodsTypeId, number> = {
  food: 150,
  clothing: 100,
  medicine: 300,
  books: 120,
  hygiene: 100,
  supplies: 100,
  other: 50,
};

export function isGoodsTypeId(value: string): value is GoodsTypeId {
  return (GOODS_TYPE_IDS as readonly string[]).includes(value);
}

export function goodsTypeLabel(id: string): string {
  return GOODS_TYPES.find((type) => type.id === id)?.label ?? id;
}
