"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.unbanExpiredUsers = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
require("../../lib/admin");
const _options_1 = require("../_options");
const _auth_1 = require("../tournaments/_auth");
const db = (0, firestore_1.getFirestore)();
/**
 * Desbanea usuarios con:
 *  - users.disabled === true
 *  - users.banUntil <= now
 *
 * Seguridad: solo staff (owner/admin/mod) puede ejecutarla.
 * Devuelve conteos de cambios aplicados.
 */
exports.unbanExpiredUsers = (0, https_1.onCall)(_options_1.longOpts, async (req) => {
    const { role } = (0, _auth_1.requireAuth)(req);
    if (!(0, _auth_1.isStaff)(role)) {
        throw new https_1.HttpsError("permission-denied", "Solo staff puede ejecutar esta acción.");
    }
    const now = firestore_1.Timestamp.now();
    // Buscamos usuarios candidatos (paginando en lotes)
    const PAGE = 400;
    let last;
    let totalChecked = 0;
    let totalUnbanned = 0;
    // Utilidad para trocear promesas y no saturar Admin Auth
    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let q = db
            .collection("users")
            .where("disabled", "==", true)
            .where("banUntil", "<=", now)
            .orderBy("banUntil", "asc")
            .orderBy("__name__", "asc")
            .limit(PAGE);
        if (last)
            q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty)
            break;
        totalChecked += snap.size;
        // 1) Rehabilitar en Firebase Auth (concurrencia moderada)
        const toEnable = snap.docs.map((d) => d.id);
        for (const group of chunk(toEnable, 20)) {
            await Promise.all(group.map((uid) => admin
                .auth()
                .updateUser(uid, { disabled: false })
                .catch((err) => {
                // No abortamos toda la corrida; solo registramos
                console.error(`Auth updateUser(${uid}) failed:`, err);
                return null;
            })));
        }
        // 2) Actualizar Firestore en batch (borra banUntil, marca disabled=false)
        const batch = db.batch();
        snap.docs.forEach((d) => {
            batch.update(d.ref, {
                disabled: false,
                banUntil: firestore_1.FieldValue.delete(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
        totalUnbanned += snap.size;
        // preparar siguiente página
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < PAGE)
            break;
    }
    return {
        success: true,
        message: "Unban ejecutado.",
        totalChecked,
        totalUnbanned,
    };
});
//# sourceMappingURL=unbanExpiredUsers.js.map