"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantFounder = void 0;
const zod_1 = require("zod");
const _kit_1 = require("../_kit");
exports.grantFounder = (0, _kit_1.secureCall)(zod_1.z.object({ uid: zod_1.z.string().min(10), enabled: zod_1.z.boolean() }), async ({ claims, data, auth, db }) => {
    (0, _kit_1.assertOwner)(claims);
    const user = await auth.getUser(data.uid);
    const newClaims = { ...(user.customClaims ?? {}), isFounder: data.enabled };
    await auth.setCustomUserClaims(data.uid, newClaims);
    await db.collection("adminLogs").add({
        type: "grantFounder", actorUid: claims.user_id, targetUid: data.uid,
        enabled: data.enabled, at: Date.now(),
    });
    return { success: true, message: `Founder ${data.enabled ? "activado" : "desactivado"}.` };
});
//# sourceMappingURL=grantFounder.js.map