export const V21_DRAFT_CARD_HALF_WIDTH = 110 as const;
export const V21_DRAFT_CARD_Y_MIN = 205 as const;
export const V21_DRAFT_CARD_Y_MAX = 435 as const;

export function draftCardCenters(count: number): readonly number[] {
  if (count === 1) return Object.freeze([480]);
  if (count === 2) return Object.freeze([350, 610]);
  if (count === 3) return Object.freeze([220, 480, 740]);
  return Object.freeze([]);
}

export function draftIndexAtVirtualPoint(
  count: number,
  x: number,
  y: number,
): number | null {
  if (!Number.isInteger(count) || count < 1 || count > 3) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (y < V21_DRAFT_CARD_Y_MIN || y > V21_DRAFT_CARD_Y_MAX) return null;

  const centers = draftCardCenters(count);
  for (let index = 0; index < centers.length; index++) {
    if (Math.abs(x - centers[index]) <= V21_DRAFT_CARD_HALF_WIDTH) return index;
  }
  return null;
}
