"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HONOR_PRIOR_P0 = exports.HONOR_PRIOR_M = void 0;
exports.starsFromPosNeg = starsFromPosNeg;
exports.HONOR_PRIOR_M = 10; // fuerza del prior (ajústalo)
exports.HONOR_PRIOR_P0 = 0.7; // prior de buena conducta
function starsFromPosNeg(pos, neg) {
    const n = Math.max(0, (pos | 0) + (neg | 0));
    const pBayes = (exports.HONOR_PRIOR_M * exports.HONOR_PRIOR_P0 + pos) / (exports.HONOR_PRIOR_M + n);
    const stars = 1 + 4 * pBayes; // [0..1] -> [1..5]
    return Math.max(1, Math.min(5, Number(stars.toFixed(2))));
}
//# sourceMappingURL=_utils.js.map