"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatus = void 0;
const zod_1 = require("zod");
const _kit_1 = require("../_kit");
const https_1 = require("firebase-functions/v2/https");
exports.updateUserStatus = (0, _kit_1.secureCall)(zod_1.z.object({ uid: zod_1.z.string().min(10), disabled: zod_1.z.boolean(), duration: zod_1.z.number().int().positive().optional() }), async ({ claims, data, auth, db }) => {
    if (!["owner", "moderator"].includes(claims.role))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    await auth.updateUser(data.uid, { disabled: data.disabled });
    const banUntil = data.disabled && data.duration
        ? Date.now() + data.duration * 3600 * 1000
        : null;
    await db.collection("users").doc(data.uid).set({ disabled: data.disabled, banUntil }, { merge: true });
    await db.collection("adminLogs").add({
        type: "updateUserStatus", actorUid: claims.user_id, targetUid: data.uid,
        disabled: data.disabled, banUntil, at: Date.now(),
    });
    return { success: true, message: data.disabled ? "Usuario deshabilitado." : "Usuario habilitado." };
});
//# sourceMappingURL=updateUserStatus.js.map