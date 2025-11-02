"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.isStaff = isStaff;
exports.requireStaff = requireStaff;
exports.requireModOrAdmin = requireModOrAdmin;
const https_1 = require("firebase-functions/v2/https");
function requireAuth(req) {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const role = (req.auth.token?.role ?? "player");
    const isCertifiedStreamer = Boolean(req.auth.token?.isCertifiedStreamer);
    return { uid: req.auth.uid, role, isCertifiedStreamer };
}
// ---- helpers de autorización ----
function isStaff(role) {
    return role === "owner" || role === "admin" || role === "moderator";
}
function requireStaff(role) {
    if (!isStaff(role)) {
        throw new https_1.HttpsError("permission-denied", "No autorizado (staff solamente).");
    }
}
function requireModOrAdmin(role) {
    if (!(role === "admin" || role === "moderator")) {
        throw new https_1.HttpsError("permission-denied", "No autorizado (admin/mod).");
    }
}
//# sourceMappingURL=_auth.js.map