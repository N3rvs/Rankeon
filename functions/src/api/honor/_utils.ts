export const HONOR_PRIOR_M = 10;   // fuerza del prior (ajústalo)
export const HONOR_PRIOR_P0 = 0.7; // prior de buena conducta

export function starsFromPosNeg(pos: number, neg: number) {
  const n = Math.max(0, (pos|0) + (neg|0));
  const pBayes = (HONOR_PRIOR_M * HONOR_PRIOR_P0 + pos) / (HONOR_PRIOR_M + n);
  const stars = 1 + 4 * pBayes; // [0..1] -> [1..5]
  return Math.max(1, Math.min(5, Number(stars.toFixed(2))));
}
