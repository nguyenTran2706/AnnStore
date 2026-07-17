/* Chart palette — 8 categorical slots in FIXED order, validated for
   colorblind safety against the white card surface (worst adjacent CVD
   ΔE 24.2, target ≥ 12). Three slots (aqua, yellow, magenta) sit below
   3:1 contrast on white, which is why every chart ships a legend with
   visible text values. */
export const CHART_SLOTS = [
  '#2a78d6', // blue
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
  '#e87ba4', // magenta
  '#eb6834', // orange
];

export const OTHER_COLOR = '#a3a3a3'; // ink-faint — the fold-in bucket

/* Single-hue slots for magnitude (the column chart + top-product bars). */
export const SEQ_BASE = '#2a78d6';
export const SEQ_HOVER = '#1c5cab';
export const SEQ_FAINT = '#cde2fb';

/* Colors follow the ENTITY, never its rank: categories are sorted
   alphabetically and assigned slots in that fixed order, so a category
   keeps its color when the period toggle reorders revenues or drops
   categories out. Beyond 8 categories the alphabetical tail folds into
   "Other". */
export function assignCategoryColors(categoryNames) {
  const sorted = [...new Set(categoryNames)].sort((a, b) => a.localeCompare(b));
  const map = new Map();
  sorted.forEach((name, i) => {
    map.set(name, i < CHART_SLOTS.length ? CHART_SLOTS[i] : OTHER_COLOR);
  });
  return map;
}
