"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.longTimeoutOpts = exports.longOpts = exports.defaultOpts = exports.OWNER_UID = void 0;
// functions/src/api/_options.ts
const params_1 = require("firebase-functions/params");
exports.OWNER_UID = (0, params_1.defineSecret)("OWNER_UID");
// No uses `as const` aquí
const common = {
    region: "europe-west1",
    enforceAppCheck: true,
    secrets: [exports.OWNER_UID], // inferencia OK, no importes SecretParam
};
exports.defaultOpts = {
    ...common,
    timeoutSeconds: 15,
};
exports.longOpts = {
    ...common,
    timeoutSeconds: 60,
};
exports.longTimeoutOpts = {
    ...common,
    timeoutSeconds: 120,
};
//# sourceMappingURL=_options.js.map