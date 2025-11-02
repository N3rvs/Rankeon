"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.w1Long = exports.w1 = exports.w4XL = exports.w4Long = exports.w4 = exports.OWNER_UID = void 0;
// functions/src/api/_options.ts
const params_1 = require("firebase-functions/params");
exports.OWNER_UID = (0, params_1.defineSecret)("OWNER_UID");
// opciones comunes
const base = {
    enforceAppCheck: true,
    secrets: [exports.OWNER_UID],
};
// Firestore (tu DB está en west4)
exports.w4 = {
    ...base,
    region: "europe-west4",
    timeoutSeconds: 15,
};
exports.w4Long = { ...exports.w4, timeoutSeconds: 60 };
exports.w4XL = { ...exports.w4, timeoutSeconds: 120 };
// RTDB vive en west1
exports.w1 = {
    ...base,
    region: "europe-west1",
    timeoutSeconds: 15,
};
exports.w1Long = { ...exports.w1, timeoutSeconds: 60 };
//# sourceMappingURL=_options.js.map