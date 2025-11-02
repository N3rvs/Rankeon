"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPresence = void 0;
const zod_1 = require("zod");
const _kit_1 = require("../_kit");
exports.updateUserPresence = (0, _kit_1.secureCall)(zod_1.z.object({ status: zod_1.z.enum(["online", "away", "busy", "offline"]) }), async ({ uid, data, db }) => {
    await db.collection("users").doc(uid).set({ presence: data.status, presenceAt: Date.now() }, { merge: true });
    return { success: true, message: "OK" };
});
//# sourceMappingURL=updateUserPresence.js.map