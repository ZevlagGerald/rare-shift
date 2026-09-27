export const DRAFT_CARD_HALF_WIDTH = 110 as const;
export const DRAFT_CARD_MIN_Y = 205 as const;
export const DRAFT_CARD_MAX_Y = 435 as const;

export function draftCardCenters(count: number): readonly number[] {
  if (count === 1) return Object.freeze([480]);
  if (count === 2) return Object.freeze([350, 610]);
  if (count === 3) return Object.freeze([220, 480, 740]);
  return Object.freeze([]);
}

export function draftIndexForPoint(x: number, y: number, count: number): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (!Number.isInteger(count) || count < 1 || count > 3) return null;
  if (y < DRAFT_CARD_MIN_Y || y > DRAFT_CARD_MAX_Y) return null;

  const centers = draftCardCenters(count);
  for (let index = 0; index < centers.length; index++) {
    if (Math.abs(x - centers[index]) <= DRAFT_CARD_HALF_WIDTH) return index;
  }
  return null;
}
