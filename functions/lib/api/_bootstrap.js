"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// functions/src/_bootstrap.ts
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)(); // credenciales implícitas en Cloud Functions
}
(0, firestore_1.getFirestore)().settings({ ignoreUndefinedProperties: true });
// sin exports: es solo para efectos secundarios
//# sourceMappingURL=_bootstrap.js.map