"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureCall = secureCall;
exports.assertOwner = assertOwner;
exports.getCallerRole = getCallerRole;
exports.isStaff = isStaff;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
(0, firestore_1.getFirestore)().settings({ ignoreUndefinedProperties: true });
// --- Firebase Functions v2 / Tipos ---
const https_1 = require("firebase-functions/v2/https");
// Wrapper con seguridad por defecto (valida input con Zod, exige Auth y App Check)
function secureCall(schema, handler) {
    return (0, https_1.onCall)({
        region: "europe-west1",
        enforceAppCheck: true, // App Check obligatorio
        cors: false, // onCall maneja CORS
        invoker: "public", // llamado desde SDK con Auth+AppCheck
        concurrency: 10,
        timeoutSeconds: 15,
    }, async (req) => {
        if (!req.auth) {
            throw new https_1.HttpsError("unauthenticated", "Necesitas iniciar sesión.");
        }
        // Claims seguros + validación del payload
        const claims = (req.auth.token ?? {});
        const data = schema.parse(req.data);
        const db = (0, firestore_1.getFirestore)();
        const auth = (0, auth_1.getAuth)();
        return handler({ uid: req.auth.uid, claims, data: data, db, auth });
    });
}
// Helper para rutas solo-owner
function assertOwner(claims) {
    if (claims.role !== "owner") {
        throw new https_1.HttpsError("permission-denied", "Solo el owner puede realizar esta acción.");
    }
}
function getCallerRole(claims) {
    return (claims.role ?? "player");
}
function isStaff(role) {
    return role === "owner" || role === "admin" || role === "moderator";
}
//# sourceMappingURL=_kit.js.map