"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagedUsers = void 0;
const _kit_1 = require("../_kit");
const https_1 = require("firebase-functions/v2/https");
exports.getManagedUsers = (0, _kit_1.secureCall)(
// sin payload
// biome-ignore lint/suspicious/noExplicitAny: simple
undefined, async ({ claims, db }) => {
    if (!["owner", "moderator"].includes(claims.role))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    const snap = await db.collection("users").limit(200).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { users };
});
//# sourceMappingURL=getManagedUsers.js.map