"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGlobalRole = void 0;
const zod_1 = require("zod");
const _kit_1 = require("../_kit");
exports.setGlobalRole = (0, _kit_1.secureCall)(zod_1.z.object({ uid: zod_1.z.string().min(10), role: zod_1.z.enum(["moderator", "user"]) }), async ({ claims, data, auth, db }) => {
    (0, _kit_1.assertOwner)(claims);
    const user = await auth.getUser(data.uid);
    const newClaims = { ...(user.customClaims ?? {}), role: data.role };
    await auth.setCustomUserClaims(data.uid, newClaims);
    await db.collection("adminLogs").add({
        type: "setGlobalRole", actorUid: claims.user_id, targetUid: data.uid,
        newRole: data.role, at: Date.now(),
    });
    return { success: true, message: "Rol actualizado." };
});
//# sourceMappingURL=setGlobalRole.js.map