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
exports.challengeScrim = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const ChallengeSchema = zod_1.z.object({
    scrimId: zod_1.z.string().min(1),
    challengingTeamId: zod_1.z.string().min(1), // <- lo que llega desde el cliente
});
function assertAuth(ctx) {
    if (!ctx.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
exports.challengeScrim = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { scrimId, challengingTeamId } = ChallengeSchema.parse(req.data ?? {});
    const ref = db.doc(`scrims/${scrimId}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'Scrim not found');
        const scrim = snap.data();
        // No permitir desafiar scrims canceladas o ya aceptadas
        if (scrim.status && scrim.status !== 'open') {
            throw new https_1.HttpsError('failed-precondition', `Scrim is not open (status: ${scrim.status})`);
        }
        // El creador original de la scrim no puede “desafiar” su propia scrim
        if (scrim.teamId === challengingTeamId) {
            throw new https_1.HttpsError('failed-precondition', 'You cannot challenge your own scrim.');
        }
        // (Opcional) comprueba que el usuario pertenece al equipo que desafía
        const membership = await db.collection('teamMembers')
            .where('teamId', '==', challengingTeamId)
            .where('uid', '==', uid)
            .limit(1)
            .get();
        if (membership.empty) {
            throw new https_1.HttpsError('permission-denied', 'You are not a member of the challenging team.');
        }
        // ✅ FIX: usar clave -> valor
        tx.update(ref, {
            status: 'challenged',
            challengerTeamId: challengingTeamId, // ← aquí el arreglo
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { success: true, message: 'Scrim challenged successfully.' };
});
//# sourceMappingURL=scrims.js.map