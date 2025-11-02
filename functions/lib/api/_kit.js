"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureCall = secureCall;
exports.assertOwner = assertOwner;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
// Wrapper con seguridad por defecto
function secureCall(schema, handler) {
    return (0, https_1.onCall)({
        region: "europe-west1",
        enforceAppCheck: true, // App Check obligatorio
        cors: false, // onCall maneja CORS
        invoker: "public", // solo invocable vía SDK (Auth+AppCheck entran)
        concurrency: 10, // opcional: limita concurrencia
        timeoutSeconds: 15, // duro pero razonable
    }, async (req) => {
        if (!req.auth)
            throw new https_1.HttpsError("unauthenticated", "Necesitas iniciar sesión.");
        const claims = (req.auth.token ?? {});
        const data = schema.parse(req.data);
        const db = (0, firestore_1.getFirestore)();
        const auth = (0, auth_1.getAuth)();
        return handler({ uid: req.auth.uid, claims, data, db, auth });
    });
}
function assertOwner(claims) {
    if (claims.role !== "owner") {
        throw new https_1.HttpsError("permission-denied", "Solo el owner puede realizar esta acción.");
    }
}
//# sourceMappingURL=_kit.js.map