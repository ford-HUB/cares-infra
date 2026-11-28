import type {
  RankColorCombo,
  RankFrameDesign,
  RankFrameDesignId,
} from '../types/ranking'

/** Ornament only; colours are chosen per tier. */
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

/** The schema's enum is built from this. */
export const RANK_FRAME_IDS = RANK_FRAME_DESIGNS.map((design) => design.id) as [
  RankFrameDesignId,
  ...RankFrameDesignId[],
]

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

/** What `<input type="color">` emits and the schema accepts. */
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export function nextUnusedFrame(used: RankFrameDesignId[]): RankFrameDesignId {
  return RANK_FRAME_IDS.find((id) => !used.includes(id)) ?? RANK_FRAME_FALLBACK
}

export const RANK_FRAME_DEFAULT_COLORS = {
  colorFrom: RANK_COLOR_COMBOS[6].colorFrom,
  colorTo: RANK_COLOR_COMBOS[6].colorTo,
}
