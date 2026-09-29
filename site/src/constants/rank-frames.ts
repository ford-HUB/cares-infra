import type {
  RankColorCombo,
  RankFrameDesign,
  RankFrameDesignId,
} from '../types/ranking'

/**
 * The frame gallery a director picks from in Customization. A preset is the
 * ornament only — colours are chosen separately per tier, so the same design can
 * dress Mythic in gold and Legend in violet.
 */
export const RANK_FRAME_DESIGNS: RankFrameDesign[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Winged ring with a crown gem',
  },
  {
    id: 'laurel',
    label: 'Laurel',
    description: 'Victory wreath around the avatar',
  },
  {
    id: 'shield',
    label: 'Shield',
    description: 'Hex plate with riveted corners',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Twin arcs with circling markers',
  },
  {
    id: 'crown',
    label: 'Crown',
    description: 'Three-point crown over a ribbon',
  },
  {
    id: 'starburst',
    label: 'Starburst',
    description: 'Five long points behind the ring',
  },
  {
    id: 'blossom',
    label: 'Blossom',
    description: 'Eight petals opening outward',
  },
  {
    id: 'gear',
    label: 'Gear',
    description: 'Toothed cog with a bolted hub',
  },
  {
    id: 'flame',
    label: 'Flame',
    description: 'Three tongues rising off the band',
  },
  {
    id: 'prism',
    label: 'Prism',
    description: 'Tilted facet with corner gems',
  },
  {
    id: 'halo',
    label: 'Halo',
    description: 'Floating arc over a thin band',
  },
  {
    id: 'ring',
    label: 'Ring',
    description: 'Clean band, no ornament',
  },
]

export const RANK_FRAME_FALLBACK: RankFrameDesignId = 'ring'

/**
 * The gallery's ids, in gallery order. The schema's enum is built from this, so a
 * new preset is one edit to the list above rather than two lists drifting apart.
 */
export const RANK_FRAME_IDS = RANK_FRAME_DESIGNS.map((design) => design.id) as [
  RankFrameDesignId,
  ...RankFrameDesignId[],
]

/**
 * One-click gradient pairs. They are a shortcut for the two colour inputs, not a
 * separate setting — picking one just writes both stops.
 */
export const RANK_COLOR_COMBOS: RankColorCombo[] = [
  { id: 'sunburst', label: 'Sunburst', colorFrom: '#facc15', colorTo: '#f97316' },
  { id: 'amethyst', label: 'Amethyst', colorFrom: '#a78bfa', colorTo: '#6366f1' },
  { id: 'lagoon', label: 'Lagoon', colorFrom: '#38bdf8', colorTo: '#2563eb' },
  { id: 'jade', label: 'Jade', colorFrom: '#34d399', colorTo: '#0f766e' },
  { id: 'ember', label: 'Ember', colorFrom: '#fb7185', colorTo: '#be123c' },
  { id: 'orchid', label: 'Orchid', colorFrom: '#f0abfc', colorTo: '#a21caf' },
  { id: 'steel', label: 'Steel', colorFrom: '#cbd5e1', colorTo: '#64748b' },
  { id: 'forest', label: 'Forest', colorFrom: '#86efac', colorTo: '#166534' },
]

/** Six-digit hex — what `<input type="color">` emits, and what the schema accepts. */
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/**
 * The first design nothing else in the ladder is wearing, so an added tier never
 * arrives looking identical to one already there.
 */
export function nextUnusedFrame(used: RankFrameDesignId[]): RankFrameDesignId {
  return RANK_FRAME_IDS.find((id) => !used.includes(id)) ?? RANK_FRAME_FALLBACK
}

/** Colours a newly cut tier starts on, before the director picks its own. */
export const RANK_FRAME_DEFAULT_COLORS = {
  colorFrom: RANK_COLOR_COMBOS[6].colorFrom,
  colorTo: RANK_COLOR_COMBOS[6].colorTo,
}
